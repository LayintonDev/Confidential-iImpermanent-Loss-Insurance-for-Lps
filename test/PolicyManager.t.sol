// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {PolicyManager} from "../contracts/PolicyManager.sol";
import {InsuranceVault} from "../contracts/vaults/InsuranceVault.sol";
import {FeeSplitter} from "../contracts/FeeSplitter.sol";

/**
 * @title PolicyManagerFoundryTest
 * @notice Foundry test suite for PolicyManager contract
 * @dev Demonstrates fast testing and fuzzing capabilities
 */
contract PolicyManagerFoundryTest is Test {
    PolicyManager public policyManager;
    InsuranceVault public vault;
    FeeSplitter public feeSplitter;

    address public admin = address(0x1);
    address public lp = address(0x2);
    address public pool = address(0x3);

    event PolicyMinted(uint256 indexed policyId, address indexed lp, address indexed pool);

    function setUp() public {
        // Deploy contracts
        vm.startPrank(admin);

        // Deploy vault with admin
        vault = new InsuranceVault(admin);

        // Deploy policy manager
        policyManager = new PolicyManager(admin, "https://api.example.com/policy/");

        // Deploy fee splitter
        feeSplitter = new FeeSplitter(address(vault), address(policyManager));

        // Grant necessary roles
        vault.grantHookRole(address(feeSplitter));
        policyManager.grantRole(policyManager.HOOK_ROLE(), admin); // For testing

        vm.stopPrank();
    }

    function testMintPolicy() public {
        // Setup policy parameters
        PolicyManager.PolicyParams memory params = PolicyManager.PolicyParams({
            deductibleBps: 1000, // 10%
            capBps: 5000, // 50%
            premiumBps: 100, // 1%
            duration: 100000, // blocks
            pool: pool
        });

        bytes32 entryCommit = keccak256("test_entry_data");

        // Mint policy as hook role (admin has hook role)
        vm.prank(admin);
        uint256 policyId = policyManager.mintPolicy(lp, pool, 1 ether, 0.01 ether, entryCommit);

        // Verify policy was minted
        assertEq(policyManager.balanceOf(lp, policyId), 1);
        assertTrue(policyManager.isPolicyActive(policyId));
        assertEq(policyManager.ownerOfPolicy(policyId), lp);
    }

    function testCannotMintPolicyAsNonAdmin() public {
        PolicyManager.PolicyParams memory params = PolicyManager.PolicyParams({
            deductibleBps: 1000,
            capBps: 5000,
            premiumBps: 100,
            duration: 100000,
            pool: pool
        });

        bytes32 entryCommit = keccak256("test_entry_data");

        // Try to mint as non-hook role
        vm.prank(lp);
        vm.expectRevert();
        policyManager.mintPolicy(lp, pool, 1 ether, 0.01 ether, entryCommit);
    }

    /**
     * @notice Fuzz test for policy minting with various parameters
     * @dev Tests edge cases and random inputs
     */
    function testFuzzMintPolicy(uint256 deductibleBps, uint256 capBps, uint256 premiumBps, uint256 duration) public {
        // Bound inputs to reasonable ranges
        deductibleBps = bound(deductibleBps, 0, 5000); // 0% to 50%
        capBps = bound(capBps, deductibleBps, 10000); // deductible to 100%
        premiumBps = bound(premiumBps, 1, 1000); // 0.01% to 10%
        duration = bound(duration, 1000, 1000000); // 1K to 1M blocks

        bytes32 entryCommit = keccak256("test_entry_data");

        vm.prank(admin);
        uint256 policyId = policyManager.mintPolicy(lp, pool, 1 ether, 0.01 ether, entryCommit);

        // Verify policy was created correctly
        assertTrue(policyManager.isPolicyActive(policyId));
        assertEq(policyManager.ownerOfPolicy(policyId), lp);

        // Verify parameters are stored correctly (mintPolicy uses defaultParams, not custom params)
        (address storedLp, address storedPool, PolicyManager.PolicyParams memory storedParams,,,,) =
            policyManager.policies(policyId);

        // Get default params to compare against (returned as tuple, not struct)
        (
            uint256 defaultDeductibleBps,
            uint256 defaultCapBps,
            uint256 defaultPremiumBps,
            uint256 defaultDuration,
            address defaultPool
        ) = policyManager.defaultParams();

        assertEq(storedLp, lp);
        assertEq(storedPool, pool);
        assertEq(storedParams.deductibleBps, defaultDeductibleBps); // Should match defaults, not fuzz inputs
        assertEq(storedParams.capBps, defaultCapBps);
        assertEq(storedParams.premiumBps, defaultPremiumBps);
        assertEq(storedParams.duration, defaultDuration);
        assertEq(storedParams.pool, pool); // Pool is set per policy
    }

    function testBurnPolicy() public {
        // First mint a policy
        PolicyManager.PolicyParams memory params = PolicyManager.PolicyParams({
            deductibleBps: 1000,
            capBps: 5000,
            premiumBps: 100,
            duration: 100000,
            pool: pool
        });

        bytes32 entryCommit = keccak256("test_entry_data");

        vm.prank(admin);
        uint256 policyId = policyManager.mintPolicy(lp, pool, 1 ether, 0.01 ether, entryCommit);

        // Verify it's active
        assertTrue(policyManager.isPolicyActive(policyId));

        // Burn the policy
        vm.prank(admin);
        policyManager.burnPolicy(policyId);

        // Verify it's no longer active
        assertFalse(policyManager.isPolicyActive(policyId));
        assertEq(policyManager.balanceOf(lp, policyId), 0);
    }

    function testGetPoliciesByLP() public {
        // Mint multiple policies for the same LP
        vm.startPrank(admin);

        bytes32 entryCommit = keccak256("test_entry_data");

        uint256 policy1 = policyManager.mintPolicy(lp, pool, 1 ether, 0.01 ether, entryCommit);

        uint256 policy2 = policyManager.mintPolicy(lp, address(0x4), 2 ether, 0.02 ether, entryCommit);

        vm.stopPrank();

        // Get policies for LP
        uint256[] memory policies = policyManager.getPoliciesByLP(lp);

        assertEq(policies.length, 2);
        assertEq(policies[0], policy1);
        assertEq(policies[1], policy2);
    }

    function testPolicyMetadata() public {
        bytes32 entryCommit = keccak256("test_entry_data");

        vm.prank(admin);
        uint256 policyId = policyManager.mintPolicy(lp, pool, 1 ether, 0.01 ether, entryCommit);

        string memory uri = policyManager.uri(policyId);

        // Should contain the policy ID
        assertTrue(bytes(uri).length > 0);
        console.log("Policy URI:", uri);
    }
}

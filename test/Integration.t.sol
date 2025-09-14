// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ConfidentialILHook} from "../contracts/hooks/ConfidentialILHook.sol";
import {FeeSplitter} from "../contracts/FeeSplitter.sol";
import {InsuranceVault} from "../contracts/vaults/InsuranceVault.sol";
import {PolicyManager} from "../contracts/PolicyManager.sol";

/**
 * @title IntegrationTest
 * @notice Integration tests for the complete premium flow
 * @dev Tests the flow from hook afterSwap to FeeSplitter to InsuranceVault
 * @dev Note: Some tests are simplified due to Uniswap V4 manager access control requirements
 */
contract IntegrationTest is Test {
    ConfidentialILHook public hook;
    FeeSplitter public feeSplitter;
    InsuranceVault public vault;
    PolicyManager public policyManager;

    address public admin = address(0x1);
    address public pool1 = address(0x2);
    address public lp = address(0x3);

    event PremiumSkimmed(address indexed pool, uint256 amount);

    function setUp() public {
        vm.startPrank(admin);

        // Deploy core contracts
        vault = new InsuranceVault(admin);
        policyManager = new PolicyManager(admin, "https://api.example.com/policy/");
        feeSplitter = new FeeSplitter(admin, address(vault));

        // Deploy hook with correct constructor parameters
        hook = new ConfidentialILHook(
            address(policyManager),
            address(vault),
            address(feeSplitter),
            admin
        );

        // Setup roles and permissions
        vault.grantHookRole(address(feeSplitter));
        feeSplitter.grantRole(feeSplitter.HOOK_ROLE(), address(hook));

        // Whitelist pool for premium extraction
        hook.whitelistPool(pool1);

        vm.stopPrank();
    }

    function testFeeSplitterIntegrationWithVault() public {
        // Initialize pool via FeeSplitter directly (simulating hook call)
        vm.prank(address(hook));
        uint256 premium1 = feeSplitter.extractPremium(pool1, 1000, 2000);
        assertEq(premium1, 0); // First call initializes

        // Set premium rate
        vm.prank(admin);
        feeSplitter.setPremiumRate(pool1, 500); // 5%

        // Extract premium with fee growth (simulating hook call)
        vm.prank(address(hook));
        uint256 premium2 = feeSplitter.extractPremium(pool1, 1200, 2200);
        
        // Expected premium: delta0=200, delta1=200, avg=200, rate=5% => 200*500/10000=10
        assertEq(premium2, 10);

        // Verify premium was deposited to vault
        assertEq(vault.totalPremiumsCollected(pool1), 10);
    }

    function testMultiplePoolFeeSplitterIntegration() public {
        address pool2 = address(0x4);
        
        // Initialize both pools
        vm.startPrank(address(hook));
        feeSplitter.extractPremium(pool1, 1000, 2000);
        feeSplitter.extractPremium(pool2, 2000, 3000);
        vm.stopPrank();

        // Set different premium rates
        vm.startPrank(admin);
        feeSplitter.setPremiumRate(pool1, 300); // 3%
        feeSplitter.setPremiumRate(pool2, 600); // 6%
        vm.stopPrank();

        // Extract premiums for both pools
        vm.startPrank(address(hook));
        uint256 premium1 = feeSplitter.extractPremium(pool1, 1100, 2100); // delta avg = 100
        uint256 premium2 = feeSplitter.extractPremium(pool2, 2150, 3150); // delta avg = 150
        vm.stopPrank();

        // Verify calculations
        assertEq(premium1, 100 * 300 / 10000); // 3
        assertEq(premium2, 150 * 600 / 10000); // 9

        // Verify vault balances
        assertEq(vault.totalPremiumsCollected(pool1), 3);
        assertEq(vault.totalPremiumsCollected(pool2), 9);
    }

    function testFeeSplitterErrorHandling() public {
        // Test unauthorized access
        vm.prank(lp);
        vm.expectRevert();
        feeSplitter.extractPremium(pool1, 1000, 2000);

        // Test invalid pool
        vm.prank(address(hook));
        vm.expectRevert();
        feeSplitter.extractPremium(address(0), 1000, 2000);
    }

    function testVaultIntegrationErrorHandling() public {
        // Initialize pool
        vm.prank(address(hook));
        feeSplitter.extractPremium(pool1, 1000, 2000);

        // Verify hook has role before revoking
        assertTrue(feeSplitter.hasRole(feeSplitter.HOOK_ROLE(), address(hook)));

        // Admin should be able to revoke roles (admin has DEFAULT_ADMIN_ROLE)
        vm.startPrank(admin);
        feeSplitter.revokeRole(feeSplitter.HOOK_ROLE(), address(hook));
        vm.stopPrank();

        // Verify hook no longer has role
        assertFalse(feeSplitter.hasRole(feeSplitter.HOOK_ROLE(), address(hook)));

        // Set premium rate
        vm.prank(admin);
        feeSplitter.setPremiumRate(pool1, 500);

        // Should revert when hook tries to call extractPremium without role
        vm.prank(address(hook));
        vm.expectRevert();
        feeSplitter.extractPremium(pool1, 1200, 2200);
        
        // Verify no additional premium was deposited (still 0 from initialization)
        assertEq(vault.totalPremiumsCollected(pool1), 0);
    }
}

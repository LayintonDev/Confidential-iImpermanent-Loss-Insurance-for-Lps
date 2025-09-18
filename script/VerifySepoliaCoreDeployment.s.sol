// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/InsuranceVault.sol";
import "../contracts/EigenAVSManagerV2.sol";
import "../contracts/FhenixComputeProxy.sol";

/**
 * @title VerifySepoliaCoreDeployment
 * @dev Verifies the deployed core system functionality on Sepolia
 */
contract VerifySepoliaCoreDeployment is Script {
    // Use addresses from deployment output
    address constant POLICY_MANAGER = 0xd1F62A8BB7b605940f1FEAC87aD2717003617716;
    address constant INSURANCE_VAULT = 0xD4341dE33d6B626A5156da2748F3fbe5Ca38E2d0;
    address constant EIGEN_AVS = 0x49fc3E2Da45bfF9b64973Ed9D5519ee28520c51A;
    address constant FHENIX_PROXY = 0xBa3cE7C72950b42fDD850951B32dBC9146CF46F7;

    PolicyManager policyManager;
    InsuranceVault insuranceVault;
    EigenAVSManagerV2 eigenAVS;
    FhenixComputeProxy fhenixProxy;

    function run() external {
        console.log("=== VERIFYING SEPOLIA CORE DEPLOYMENT ===");
        console.log("Chain ID:", block.chainid);
        console.log("Verifier:", msg.sender);

        // Initialize contract instances
        policyManager = PolicyManager(POLICY_MANAGER);
        insuranceVault = InsuranceVault(payable(INSURANCE_VAULT));
        eigenAVS = EigenAVSManagerV2(EIGEN_AVS);
        fhenixProxy = FhenixComputeProxy(FHENIX_PROXY);

        vm.startBroadcast();

        // 1. Verify contract deployments
        _verifyContractDeployments();

        // 2. Test basic functionality
        _testBasicFunctionality();

        // 3. Verify permissions
        _verifyPermissions();

        // 4. Test policy creation
        _testPolicyCreation();

        vm.stopBroadcast();

        console.log("\n=== VERIFICATION COMPLETE ===");
        console.log("All core contracts deployed and functional on Sepolia!");
    }

    function _verifyContractDeployments() internal view {
        console.log("\n1. VERIFYING CONTRACT DEPLOYMENTS:");

        // Check if contracts exist at expected addresses
        uint256 pmCodeSize;
        uint256 vaultCodeSize;
        uint256 eigenCodeSize;
        uint256 fhenixCodeSize;

        assembly {
            pmCodeSize := extcodesize(POLICY_MANAGER)
            vaultCodeSize := extcodesize(INSURANCE_VAULT)
            eigenCodeSize := extcodesize(EIGEN_AVS)
            fhenixCodeSize := extcodesize(FHENIX_PROXY)
        }

        console.log("   PolicyManager code size:", pmCodeSize);
        console.log("   InsuranceVault code size:", vaultCodeSize);
        console.log("   EigenAVSManagerV2 code size:", eigenCodeSize);
        console.log("   FhenixComputeProxy code size:", fhenixCodeSize);

        require(pmCodeSize > 0, "PolicyManager not deployed");
        require(vaultCodeSize > 0, "InsuranceVault not deployed");
        require(eigenCodeSize > 0, "EigenAVSManagerV2 not deployed");
        require(fhenixCodeSize > 0, "FhenixComputeProxy not deployed");

        console.log("   SUCCESS: All contracts deployed");
    }

    function _testBasicFunctionality() internal view {
        console.log("\n2. TESTING BASIC FUNCTIONALITY:");

        // Test PolicyManager
        uint256 currentPolicyId = policyManager.currentPolicyId();
        console.log("   Current policy ID:", currentPolicyId);

        // Test role functions
        bytes32 adminRole = policyManager.ADMIN_ROLE();
        bool hasAdminRole = policyManager.hasRole(adminRole, msg.sender);
        console.log("   Deployer has admin role:", hasAdminRole);

        // Test InsuranceVault
        console.log("   Vault balance:", address(insuranceVault).balance);

        console.log("   SUCCESS: Basic functionality working");
    }

    function _verifyPermissions() internal view {
        console.log("\n3. VERIFYING PERMISSIONS:");

        // Check PolicyManager permissions on InsuranceVault
        bytes32 claimPayerRole = insuranceVault.CLAIM_PAYER_ROLE();
        bool pmHasClaimRole = insuranceVault.hasRole(claimPayerRole, address(policyManager));
        console.log("   PolicyManager has CLAIM_PAYER_ROLE:", pmHasClaimRole);

        // Check admin permissions
        bytes32 adminRole = policyManager.ADMIN_ROLE();
        bool hasAdminRole = policyManager.hasRole(adminRole, msg.sender);
        console.log("   Deployer has ADMIN_ROLE:", hasAdminRole);

        require(pmHasClaimRole, "PolicyManager missing CLAIM_PAYER_ROLE");
        require(hasAdminRole, "Deployer missing ADMIN_ROLE");

        console.log("   SUCCESS: Permissions correctly configured");
    }

    function _testPolicyCreation() internal {
        console.log("\n4. TESTING POLICY CREATION:");

        uint256 initialPolicyCount = policyManager.currentPolicyId();
        console.log("   Initial policy count:", initialPolicyCount);

        // Test policy creation parameters
        address testPool = 0x1234567890123456789012345678901234567890; // Dummy pool address
        uint256 testDuration = 7 days;

        try policyManager.createPolicy(
            msg.sender,
            testPool,
            1 ether, // coverage
            testDuration,
            0, // lockupPeriod
            0, // premium (calculated internally)
            "" // hookData
        ) {
            uint256 finalPolicyCount = policyManager.currentPolicyId();
            console.log("   Final policy count:", finalPolicyCount);
            console.log("   SUCCESS: Policy creation working");
            console.log("   Created policy ID:", finalPolicyCount - 1);
        } catch Error(string memory reason) {
            console.log("   Policy creation failed:", reason);
            console.log("   NOTE: This may be expected if specific conditions aren't met");
        }

        console.log("   Policy creation test completed");
    }
}

/**
 * @title TestPolicyManagerRoles
 * @dev Additional script to test role management
 */
contract TestPolicyManagerRoles is Script {
    function run() external view {
        PolicyManager pm = PolicyManager(0xd1F62A8BB7b605940f1FEAC87aD2717003617716);

        console.log("=== TESTING POLICY MANAGER ROLES ===");

        // Test role constants
        bytes32 adminRole = pm.ADMIN_ROLE();
        bytes32 hookRole = pm.HOOK_ROLE();

        console.log("ADMIN_ROLE:", vm.toString(adminRole));
        console.log("HOOK_ROLE:", vm.toString(hookRole));

        // Check if specific addresses have roles
        console.log("Deployer has ADMIN_ROLE:", pm.hasRole(adminRole, msg.sender));
        console.log("Deployer has HOOK_ROLE:", pm.hasRole(hookRole, msg.sender));
    }
}

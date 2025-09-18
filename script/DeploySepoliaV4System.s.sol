// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/hooks/SimpleV4Hook.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/InsuranceVault.sol";
import "../contracts/FeeSplitter.sol";
import "../contracts/EigenAVSManagerV2.sol";
import "../contracts/FhenixComputeProxy.sol";

/**
 * @title DeploySepoliaV4System
 * @dev Deploys the complete V4-integrated insurance system to Sepolia testnet
 */
contract DeploySepoliaV4System is Script {
    // Deployment configuration
    string constant DEPLOYMENT_SALT = "ConfidentialILInsuranceV4_Sepolia_v1.0.0";

    // Contract instances
    PolicyManager public policyManager;
    InsuranceVault public insuranceVault;
    FeeSplitter public feeSplitter;
    FhenixComputeProxy public fhenixComputeProxy;
    EigenAVSManagerV2 public eigenAVSManager;
    SimpleV4Hook public simpleV4Hook;

    // Uniswap V4 PoolManager address on Sepolia
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;

    function run() external {
        // Get deployer from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== SEPOLIA V4 SYSTEM DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy core insurance contracts
        _deployInsuranceContracts(deployer);

        // 2. Deploy V4-integrated hook
        _deployV4Hook(deployer);

        // 3. Configure cross-contract permissions
        _configurePermissions();

        // 4. Verify deployment
        _verifyDeployment();

        // 5. Output deployment summary
        _outputDeploymentSummary();

        vm.stopBroadcast();

        console.log("\n=== SEPOLIA DEPLOYMENT COMPLETE ===");
    }

    function _deployInsuranceContracts(address deployer) internal {
        console.log("\n1. Deploying Insurance System...");

        // Deploy InsuranceVault first
        insuranceVault = new InsuranceVault();
        console.log("   InsuranceVault deployed at:", address(insuranceVault));

        // Deploy PolicyManager
        policyManager = new PolicyManager(
            "https://api.confidential-il-insurance.com/policy/{id}", // Base URI
            address(insuranceVault) // Vault address
        );
        console.log("   PolicyManager deployed at:", address(policyManager));

        // Deploy FeeSplitter
        address[] memory payees = new address[](2);
        uint256[] memory shares = new uint256[](2);
        payees[0] = deployer; // Protocol treasury
        payees[1] = address(insuranceVault); // Insurance vault
        shares[0] = 30; // 30% to protocol
        shares[1] = 70; // 70% to insurance

        feeSplitter = new FeeSplitter(payees, shares);
        console.log("   FeeSplitter deployed at:", address(feeSplitter));

        // Deploy FhenixComputeProxy
        fhenixComputeProxy = new FhenixComputeProxy();
        console.log("   FhenixComputeProxy deployed at:", address(fhenixComputeProxy));

        // Deploy EigenAVSManagerV2
        eigenAVSManager = new EigenAVSManagerV2(
            address(policyManager),
            1 ether, // Minimum stake: 1 ETH
            3, // Signature threshold: 3
            10 // Operator count: 10
        );
        console.log("   EigenAVSManagerV2 deployed at:", address(eigenAVSManager));

        console.log("   SUCCESS: All insurance contracts deployed");
    }

    function _deployV4Hook(address deployer) internal {
        console.log("\n2. Deploying V4-Integrated Hook...");

        // Deploy SimpleV4Hook
        simpleV4Hook = new SimpleV4Hook(
            SEPOLIA_POOL_MANAGER,
            address(policyManager),
            address(insuranceVault),
            address(feeSplitter),
            address(eigenAVSManager),
            address(fhenixComputeProxy)
        );

        console.log("   SimpleV4Hook deployed at:", address(simpleV4Hook));
        console.log("   Hook Permissions:", simpleV4Hook.getHookPermissions());
        console.log("   V4 Compatible:", simpleV4Hook.isV4Compatible());

        console.log("   SUCCESS: V4 Hook deployed and configured");
    }

    function _configurePermissions() internal {
        console.log("\n3. Configuring Cross-Contract Permissions...");

        // Grant HOOK_ROLE to V4Hook in PolicyManager
        bytes32 hookRole = policyManager.HOOK_ROLE();
        policyManager.grantRole(hookRole, address(simpleV4Hook));
        console.log("   Granted HOOK_ROLE to V4Hook in PolicyManager");

        // Grant HOOK_ROLE to V4Hook in InsuranceVault
        insuranceVault.grantRole(insuranceVault.HOOK_ROLE(), address(simpleV4Hook));
        console.log("   Granted HOOK_ROLE to V4Hook in InsuranceVault");

        // Grant access for PolicyManager in InsuranceVault
        insuranceVault.grantRole(insuranceVault.HOOK_ROLE(), address(policyManager));
        console.log("   Granted HOOK_ROLE to PolicyManager in InsuranceVault");

        // Set up EigenAVS integration
        policyManager.grantRole(policyManager.HOOK_ROLE(), address(eigenAVSManager));
        console.log("   Granted HOOK_ROLE to EigenAVS in PolicyManager");

        console.log("   SUCCESS: All permissions configured");
    }

    function _verifyDeployment() internal view {
        console.log("\n4. Verifying Deployment...");

        // Verify contract deployments
        require(address(policyManager) != address(0), "PolicyManager not deployed");
        require(address(insuranceVault) != address(0), "InsuranceVault not deployed");
        require(address(feeSplitter) != address(0), "FeeSplitter not deployed");
        require(address(fhenixComputeProxy) != address(0), "FhenixComputeProxy not deployed");
        require(address(eigenAVSManager) != address(0), "EigenAVSManagerV2 not deployed");
        require(address(simpleV4Hook) != address(0), "SimpleV4Hook not deployed");

        // Verify permissions
        bytes32 hookRole = policyManager.HOOK_ROLE();
        require(policyManager.hasRole(hookRole, address(simpleV4Hook)), "Hook missing PolicyManager permissions");
        require(
            insuranceVault.hasRole(insuranceVault.HOOK_ROLE(), address(simpleV4Hook)),
            "Hook missing InsuranceVault permissions"
        );

        // Verify V4 Hook functionality
        require(simpleV4Hook.isV4Compatible(), "Hook not V4 compatible");
        require(simpleV4Hook.getHookPermissions() == 1088, "Hook permissions incorrect");

        console.log("   SUCCESS: All verifications passed");
    }

    function _outputDeploymentSummary() internal view {
        console.log("\n=== SEPOLIA DEPLOYMENT SUMMARY ===");

        console.log("\nContract Addresses for Frontend Configuration:");
        console.log("NEXT_PUBLIC_POLICY_MANAGER_ADDRESS=%s", address(policyManager));
        console.log("NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS=%s", address(insuranceVault));
        console.log("NEXT_PUBLIC_FEE_SPLITTER_ADDRESS=%s", address(feeSplitter));
        console.log("NEXT_PUBLIC_FHENIX_PROXY_ADDRESS=%s", address(fhenixComputeProxy));
        console.log("NEXT_PUBLIC_EIGEN_AVS_MANAGER_ADDRESS=%s", address(eigenAVSManager));
        console.log("NEXT_PUBLIC_HOOK_ADDRESS=%s", address(simpleV4Hook));

        console.log("\nLegacy compatibility addresses:");
        console.log("NEXT_PUBLIC_VAULT_ADDRESS=%s", address(insuranceVault));
        console.log("NEXT_PUBLIC_AVS_MANAGER_ADDRESS=%s", address(eigenAVSManager));
        console.log("NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS=%s", address(feeSplitter));
        console.log("NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS=%s", address(simpleV4Hook));
        console.log("NEXT_PUBLIC_FHENIX_COMPUTE_PROXY_ADDRESS=%s", address(fhenixComputeProxy));

        console.log("\nDeployment Info:");
        console.log("NEXT_PUBLIC_DEPLOYMENT_BLOCK=%d", block.number);
        console.log("Chain ID: %d", block.chainid);

        console.log("\nEtherscan Verification URLs:");
        console.log("PolicyManager: https://sepolia.etherscan.io/address/%s", address(policyManager));
        console.log("InsuranceVault: https://sepolia.etherscan.io/address/%s", address(insuranceVault));
        console.log("SimpleV4Hook: https://sepolia.etherscan.io/address/%s", address(simpleV4Hook));
        console.log("EigenAVSManagerV2: https://sepolia.etherscan.io/address/%s", address(eigenAVSManager));
        console.log("FhenixComputeProxy: https://sepolia.etherscan.io/address/%s", address(fhenixComputeProxy));
        console.log("FeeSplitter: https://sepolia.etherscan.io/address/%s", address(feeSplitter));

        console.log("\n=== V4 INTEGRATION STATUS ===");
        console.log("Hook V4 Compatible: %s", simpleV4Hook.isV4Compatible() ? "TRUE" : "FALSE");
        console.log("Hook Permissions: %d", simpleV4Hook.getHookPermissions());
        console.log("Cross-contract permissions: CONFIGURED");
        console.log("Ready for frontend integration: TRUE");
        console.log("Ready for Fhenix service: TRUE");
        console.log("Ready for EigenLayer operators: TRUE");

        console.log("\n=== NEXT STEPS ===");
        console.log("1. Update frontend/.env.sepolia with the addresses above");
        console.log("2. Deploy Fhenix compute service to production");
        console.log("3. Register EigenLayer operators");
        console.log("4. Deploy frontend with Sepolia configuration");
        console.log("5. Test end-to-end user flows on Sepolia");
    }
}

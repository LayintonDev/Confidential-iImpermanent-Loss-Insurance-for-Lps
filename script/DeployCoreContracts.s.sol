// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/vaults/InsuranceVault.sol";
import "../contracts/FeeSplitter.sol";
import "../contracts/hooks/ConfidentialILHook.sol";
import "../contracts/FhenixComputeProxy.sol";

/**
 * @title Deploy Core Contracts (Without EigenLayer)
 * @notice Deploy core contracts first, EigenLayer integration can be added later
 */
contract DeployCoreContracts is Script {
    // Deployed contract addresses
    address public policyManager;
    address public insuranceVault;
    address public feeSplitter;
    address public confidentialILHook;
    address public fhenixProxy;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying core contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PolicyManager
        console.log("Deploying PolicyManager...");
        policyManager = address(
            new PolicyManager(
                deployer, // admin
                "https://api.insurance.protocol/metadata/{id}.json"
            )
        );
        console.log("PolicyManager deployed at:", policyManager);

        // 2. Deploy InsuranceVault
        console.log("Deploying InsuranceVault...");
        insuranceVault = address(
            new InsuranceVault(
                PolicyManager(policyManager),
                deployer // admin
            )
        );
        console.log("InsuranceVault deployed at:", insuranceVault);

        // 3. Deploy FeeSplitter
        console.log("Deploying FeeSplitter...");
        feeSplitter = address(
            new FeeSplitter(
                payable(insuranceVault),
                deployer // admin
            )
        );
        console.log("FeeSplitter deployed at:", feeSplitter);

        // 4. Deploy FhenixComputeProxy
        console.log("Deploying FhenixComputeProxy...");
        fhenixProxy = address(
            new FhenixComputeProxy(
                deployer, // admin
                "worker-sepolia-001"
            )
        );
        console.log("FhenixComputeProxy deployed at:", fhenixProxy);

        // 5. Deploy ConfidentialILHook
        console.log("Deploying ConfidentialILHook...");
        confidentialILHook = address(
            new ConfidentialILHook(
                policyManager,
                payable(insuranceVault),
                feeSplitter,
                deployer // admin
            )
        );
        console.log("ConfidentialILHook deployed at:", confidentialILHook);

        // 6. Setup roles and permissions
        console.log("Setting up roles and permissions...");

        // Grant HOOK_ROLE to ConfidentialILHook in PolicyManager
        PolicyManager(policyManager).grantRole(PolicyManager(policyManager).HOOK_ROLE(), confidentialILHook);

        // Grant HOOK_ROLE to ConfidentialILHook in FeeSplitter
        FeeSplitter(feeSplitter).grantRole(FeeSplitter(feeSplitter).HOOK_ROLE(), confidentialILHook);

        vm.stopBroadcast();

        // 7. Log all deployed addresses
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("PolicyManager:", policyManager);
        console.log("InsuranceVault:", insuranceVault);
        console.log("FeeSplitter:", feeSplitter);
        console.log("ConfidentialILHook:", confidentialILHook);
        console.log("FhenixComputeProxy:", fhenixProxy);

        // 8. Generate .env update commands
        console.log("\n=== UPDATE YOUR .env.local ===");
        console.log("NEXT_PUBLIC_POLICY_MANAGER_ADDRESS=", policyManager);
        console.log("NEXT_PUBLIC_VAULT_ADDRESS=", insuranceVault);
        console.log("NEXT_PUBLIC_HOOK_ADDRESS=", confidentialILHook);
        console.log("NEXT_PUBLIC_FHENIX_PROXY_ADDRESS=", fhenixProxy);
        console.log("NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS=", feeSplitter);
        console.log("# EigenLayer integration can be added later");

        // 9. Verify deployment
        console.log("\n=== VERIFYING DEPLOYMENT ===");
        require(
            PolicyManager(policyManager).hasRole(PolicyManager(policyManager).HOOK_ROLE(), confidentialILHook),
            "Hook role not granted"
        );
        console.log("Core contracts deployed and configured successfully!");
    }
}

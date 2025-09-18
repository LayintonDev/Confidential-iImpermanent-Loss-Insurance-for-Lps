// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/InsuranceVault.sol";
import "../contracts/EigenAVSManagerV2.sol";
import "../contracts/FhenixComputeProxy.sol";

/**
 * @title DeploySepoliaCoreSystem
 * @dev Deploys the core insurance system without V4 dependencies
 */
contract DeploySepoliaCoreSystem is Script {
    function run() external {
        vm.startBroadcast();

        console.log("=== DEPLOYING CORE INSURANCE SYSTEM TO SEPOLIA ===");
        console.log("Deployer:", msg.sender);
        console.log("Chain ID:", block.chainid);

        // 1. Deploy PolicyManager
        console.log("\n1. Deploying PolicyManager...");
        PolicyManager policyManager = new PolicyManager(
            msg.sender, // admin
            "https://api.example.com/policy/{id}" // initialURI
        );
        console.log("   PolicyManager deployed at:", address(policyManager));

        // 2. Deploy InsuranceVault
        console.log("\n2. Deploying InsuranceVault...");
        InsuranceVault insuranceVault = new InsuranceVault(
            address(policyManager), // _policyManager
            msg.sender, // _admin
            msg.sender, // _premiumDepositor
            msg.sender // _claimPayer
        );
        console.log("   InsuranceVault deployed at:", address(insuranceVault));

        // 3. Deploy FhenixComputeProxy first
        console.log("\n3. Deploying FhenixComputeProxy...");
        FhenixComputeProxy fhenixProxy = new FhenixComputeProxy();
        console.log("   FhenixComputeProxy deployed at:", address(fhenixProxy));

        // 4. Deploy EigenAVSManagerV2
        console.log("\n4. Deploying EigenAVSManagerV2...");
        EigenAVSManagerV2 eigenAVS = new EigenAVSManagerV2(
            address(insuranceVault), // _insuranceVault
            address(0), // _delegationManager (placeholder)
            address(0), // _avsDirectory (placeholder)
            address(0), // _registryCoordinator (placeholder)
            address(0), // _stakeRegistry (placeholder)
            address(fhenixProxy), // _fhenixProxy
            1 ether, // _minimumStake
            1 // _signatureThreshold
        );
        console.log("   EigenAVSManagerV2 deployed at:", address(eigenAVS));

        // 5. Configure permissions
        console.log("\n5. Configuring permissions...");

        // Grant PolicyManager permission to pay claims from InsuranceVault
        bytes32 claimPayerRole = insuranceVault.CLAIM_PAYER_ROLE();
        insuranceVault.grantRole(claimPayerRole, address(policyManager));
        console.log("   Granted CLAIM_PAYER_ROLE to PolicyManager");

        // Grant deployer admin permissions for testing
        bytes32 adminRole = policyManager.ADMIN_ROLE();
        policyManager.grantRole(adminRole, msg.sender);
        console.log("   Granted ADMIN_ROLE to deployer");

        vm.stopBroadcast();

        // 6. Output deployment summary
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("\nContract Addresses:");
        console.log("PolicyManager:     ", address(policyManager));
        console.log("InsuranceVault:    ", address(insuranceVault));
        console.log("EigenAVSManagerV2: ", address(eigenAVS));
        console.log("FhenixComputeProxy:", address(fhenixProxy));

        console.log("\n=== FRONTEND ENVIRONMENT VARIABLES ===");
        console.log("Copy these to your frontend/.env.sepolia:");
        console.log("");
        console.log("# Sepolia Network Configuration");
        console.log("NEXT_PUBLIC_CHAIN_ID=11155111");
        console.log("NEXT_PUBLIC_CHAIN_NAME=sepolia");
        console.log("");
        console.log("# Core Contract Addresses");
        console.log(string.concat("NEXT_PUBLIC_POLICY_MANAGER_ADDRESS=", vm.toString(address(policyManager))));
        console.log(string.concat("NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS=", vm.toString(address(insuranceVault))));
        console.log("");
        console.log("# EigenLayer & Fhenix");
        console.log(string.concat("NEXT_PUBLIC_EIGEN_AVS_MANAGER_ADDRESS=", vm.toString(address(eigenAVS))));
        console.log(string.concat("NEXT_PUBLIC_FHENIX_COMPUTE_PROXY_ADDRESS=", vm.toString(address(fhenixProxy))));
        console.log("");
        console.log("# Frontend Configuration");
        console.log("NEXT_PUBLIC_ENABLE_TESTNET=true");
        console.log("NEXT_PUBLIC_DEFAULT_NETWORK=sepolia");

        console.log("\n=== NEXT STEPS ===");
        console.log("1. Update frontend/.env.sepolia with the addresses above");
        console.log("2. Test the deployment with basic policy creation");
        console.log("3. Deploy V4 hook separately once dependencies are resolved");
        console.log("4. Run frontend tests on Sepolia testnet");

        console.log("\nDeployment successful!");
    }
}

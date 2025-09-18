// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/vaults/InsuranceVault.sol";
import "../contracts/FeeSplitter.sol";
import "../contracts/hooks/ConfidentialILHook.sol";
import "../contracts/EigenAVSManagerV2.sol";
import "../contracts/FhenixComputeProxy.sol";

/**
 * @title Deploy Updated Contracts
 * @notice Deploy all contracts with latest implementations for Sepolia testnet
 */
contract DeployUpdatedContracts is Script {
    // Deployed contract addresses will be stored here
    address public policyManager;
    address public insuranceVault;
    address public feeSplitter;
    address public confidentialILHook;
    address public avsManager;
    address public fhenixProxy;

    // Admin addresses
    address constant ADMIN = 0xfd558120F12C855ba1C31E157741D39650Bd5DA9; // Your actual wallet address

    // REAL EigenLayer Sepolia testnet addresses (from official docs)
    address constant DELEGATION_MANAGER = 0xD4A7E1Bd8015057293f0D0A557088c286942e84b;
    address constant AVS_DIRECTORY = 0xa789c91ECDdae96865913130B786140Ee17aF545;
    address constant REGISTRY_COORDINATOR = 0xa789c91ECDdae96865913130B786140Ee17aF545; // Using AVSDirectory for now
    address constant STAKE_REGISTRY = 0x2E3D6c0744b10eb0A4e6F679F71554a39Ec47a5D; // Using StrategyManager for now

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying contracts to Sepolia...");
        console.log("Admin address:", ADMIN);

        // 1. Deploy PolicyManager
        console.log("Deploying PolicyManager...");
        policyManager = address(new PolicyManager(ADMIN, "https://api.confidentialil.com/metadata/{id}"));
        console.log("PolicyManager deployed at:", policyManager);

        // 2. Deploy InsuranceVault
        console.log("Deploying InsuranceVault...");
        insuranceVault = address(new InsuranceVault(ADMIN));
        console.log("InsuranceVault deployed at:", insuranceVault);

        // 3. Deploy FeeSplitter
        console.log("Deploying FeeSplitter...");
        feeSplitter = address(new FeeSplitter(ADMIN, insuranceVault));
        console.log("FeeSplitter deployed at:", feeSplitter);

        // 4. Deploy FhenixComputeProxy
        console.log("Deploying FhenixComputeProxy...");
        fhenixProxy = address(new FhenixComputeProxy());
        console.log("FhenixComputeProxy deployed at:", fhenixProxy);

        // 5. Deploy ConfidentialILHook
        console.log("Deploying ConfidentialILHook...");
        confidentialILHook = address(new ConfidentialILHook(policyManager, payable(insuranceVault), feeSplitter, ADMIN));
        console.log("ConfidentialILHook deployed at:", confidentialILHook);

        // 6. Deploy EigenAVSManagerV2
        console.log("Deploying EigenAVSManagerV2...");
        avsManager = address(
            new EigenAVSManagerV2(
                insuranceVault,
                DELEGATION_MANAGER,
                AVS_DIRECTORY,
                REGISTRY_COORDINATOR,
                STAKE_REGISTRY,
                fhenixProxy,
                1 ether, // 1 ETH minimum stake
                2 // signature threshold (2 operators minimum)
            )
        );
        console.log("EigenAVSManagerV2 deployed at:", avsManager);

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("PolicyManager:", policyManager);
        console.log("InsuranceVault:", insuranceVault);
        console.log("FeeSplitter:", feeSplitter);
        console.log("ConfidentialILHook:", confidentialILHook);
        console.log("FhenixComputeProxy:", fhenixProxy);
        console.log("EigenAVSManagerV2:", avsManager);
        console.log("Admin Address:", ADMIN);
        console.log("\nPlease update your frontend .env.local with these addresses!");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PolicyManager} from "../contracts/PolicyManager.sol";
import {InsuranceVault} from "../contracts/vaults/InsuranceVault.sol";
import {PayoutVault} from "../contracts/vaults/PayoutVault.sol";
import {ConfidentialILHook} from "../contracts/hooks/ConfidentialILHook.sol";
import {EigenAVSManager} from "../contracts/EigenAVSManager.sol";
import {FhenixComputeProxy} from "../contracts/FhenixComputeProxy.sol";
import {FeeSplitter} from "../contracts/FeeSplitter.sol";

/**
 * @title DeployMainnet
 * @notice Deployment script for Sepolia testnet
 */
contract DeploySepoliaScript is Script {
    // Deployment addresses will be logged
    PolicyManager public policyManager;
    InsuranceVault public insuranceVault;
    PayoutVault public payoutVault;
    ConfidentialILHook public hook;
    EigenAVSManager public avsManager;
    FhenixComputeProxy public fhenixProxy;

    // Deployment parameters
    address public deployer;
    bytes32 public salt;

    function setUp() public {
        // Deployer will be derived from private key in run()
        salt = vm.envBytes32("DEPLOYMENT_SALT");
    }

    function run() public {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = vm.parseUint(privateKeyString);
        deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts to Sepolia...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PolicyManager first (no dependencies)
        console.log("\n=== Deploying PolicyManager ===");
        policyManager = new PolicyManager(deployer, "https://example.com/metadata/{id}");
        console.log("PolicyManager deployed at:", address(policyManager));

        // 2. Deploy InsuranceVault
        console.log("\n=== Deploying InsuranceVault ===");
        insuranceVault = new InsuranceVault(deployer);
        console.log("InsuranceVault deployed at:", address(insuranceVault));

        // 3. Deploy PayoutVault
        console.log("\n=== Deploying PayoutVault ===");
        payoutVault = new PayoutVault(address(insuranceVault));
        console.log("PayoutVault deployed at:", address(payoutVault));

        // 4. Deploy FhenixComputeProxy
        console.log("\n=== Deploying FhenixComputeProxy ===");
        fhenixProxy = new FhenixComputeProxy();
        console.log("FhenixComputeProxy deployed at:", address(fhenixProxy));

        // 5. Deploy EigenAVSManager
        console.log("\n=== Deploying EigenAVSManager ===");
        avsManager = new EigenAVSManager(
            address(insuranceVault),
            address(0), // serviceManager (update later)
            address(fhenixProxy),
            1 ether, // minimum stake: 1 ETH
            67 // signature threshold: 67%
        );
        console.log("EigenAVSManager deployed at:", address(avsManager));

        // 6. Deploy FeeSplitter
        console.log("\n=== Deploying FeeSplitter ===");
        FeeSplitter feeSplitter = new FeeSplitter(deployer, address(insuranceVault));
        console.log("FeeSplitter deployed at:", address(feeSplitter));

        // 7. Deploy ConfidentialILHook (depends on other contracts)
        console.log("\n=== Deploying ConfidentialILHook ===");
        hook = new ConfidentialILHook(
            address(policyManager), payable(address(insuranceVault)), address(feeSplitter), deployer
        );
        console.log("ConfidentialILHook deployed at:", address(hook));

        // 8. Setup permissions and roles
        console.log("\n=== Setting up permissions ===");

        // Grant HOOK_ROLE to the hook contract
        policyManager.grantRole(policyManager.HOOK_ROLE(), address(hook));
        console.log("Granted HOOK_ROLE to ConfidentialILHook");

        // Grant necessary roles to deployer for initial setup
        policyManager.grantRole(policyManager.ADMIN_ROLE(), deployer);
        // InsuranceVault uses DEFAULT_ADMIN_ROLE (already granted in constructor)
        // PayoutVault uses DEFAULT_ADMIN_ROLE (already granted in constructor)

        console.log("Setup complete!");

        vm.stopBroadcast();

        // Log deployment summary
        logDeploymentSummary();
    }

    function logDeploymentSummary() internal view {
        console.log("\n============================================================");
        console.log("DEPLOYMENT SUMMARY - SEPOLIA TESTNET");
        console.log("============================================================");
        console.log("PolicyManager:       ", address(policyManager));
        console.log("InsuranceVault:      ", address(insuranceVault));
        console.log("PayoutVault:         ", address(payoutVault));
        console.log("ConfidentialILHook:  ", address(hook));
        console.log("EigenAVSManager:     ", address(avsManager));
        console.log("FhenixComputeProxy:  ", address(fhenixProxy));
        console.log("============================================================");
        console.log("\nSave these addresses to your .env file!");
        console.log("\nNext steps:");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Update frontend configuration");
        console.log("3. Test contract interactions");
    }
}

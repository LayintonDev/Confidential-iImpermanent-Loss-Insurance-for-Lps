// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PolicyManager} from "../contracts/PolicyManager.sol";
import {InsuranceVault} from "../contracts/vaults/InsuranceVault.sol";
import {FeeSplitter} from "../contracts/FeeSplitter.sol";
import {ConfidentialILHook} from "../contracts/hooks/ConfidentialILHook.sol";
import {EigenAVSManagerV2} from "../contracts/EigenAVSManagerV2.sol";
import {FhenixComputeProxy} from "../contracts/FhenixComputeProxy.sol";

/**
 * @title DeployInsuranceSystem
 * @notice Deploy just the insurance system components first
 * @dev This script deploys the core insurance contracts without V4 dependencies
 */
contract DeployInsuranceSystem is Script {
    // Insurance System Contracts
    InsuranceVault public insuranceVault;
    PolicyManager public policyManager;
    FeeSplitter public feeSplitter;
    ConfidentialILHook public hook;
    EigenAVSManagerV2 public avsManager;
    FhenixComputeProxy public fhenixProxy;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("\n== Insurance System Deployment ==");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        _deployInsuranceSystem();
        _setupPermissions();

        vm.stopBroadcast();

        _printSummary();
    }

    function _deployInsuranceSystem() internal {
        console.log("\n    Deploying Insurance System...");

        address deployer = msg.sender;

        // Deploy InsuranceVault
        insuranceVault = new InsuranceVault(deployer);
        console.log("OK InsuranceVault deployed:", address(insuranceVault));

        // Deploy PolicyManager
        policyManager = new PolicyManager(deployer, "https://api.example.com/policy/{id}");
        console.log("OK PolicyManager deployed:", address(policyManager));

        // Deploy FeeSplitter
        feeSplitter = new FeeSplitter(deployer, address(insuranceVault));
        console.log("OK FeeSplitter deployed:", address(feeSplitter));

        // Deploy FhenixComputeProxy
        fhenixProxy = new FhenixComputeProxy();
        console.log("OK FhenixComputeProxy deployed:", address(fhenixProxy));

        // Deploy EigenAVSManagerV2 with corrected constructor
        avsManager = new EigenAVSManagerV2(
            address(insuranceVault),
            0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A, // delegation manager
            0x0bAAC79ACD45A023E19345C352c58E7B2Ad3a06e, // avs directory (corrected checksum)
            0x1234567890123456789012345678901234567890, // registry coordinator (placeholder)
            0x1234567890123456789012345678901234567890, // stake registry (placeholder)
            address(fhenixProxy),
            1 ether, // minimum stake
            1 // signature threshold
        );
        console.log("OK EigenAVSManagerV2 deployed:", address(avsManager));

        // Deploy hook with correct constructor
        hook = new ConfidentialILHook(
            address(policyManager),
            payable(address(insuranceVault)),
            address(feeSplitter),
            deployer // admin
        );
        console.log("OK ConfidentialILHook deployed:", address(hook));
    }

    function _setupPermissions() internal {
        console.log("\n    Setting up Permissions...");

        // Grant HOOK_ROLE to the deployed hook in PolicyManager
        bytes32 HOOK_ROLE = policyManager.HOOK_ROLE();
        policyManager.grantRole(HOOK_ROLE, address(hook));

        // Grant HOOK_ROLE to the hook in InsuranceVault
        insuranceVault.grantRole(insuranceVault.HOOK_ROLE(), address(hook));

        // Also grant to PolicyManager for claim processing
        insuranceVault.grantRole(insuranceVault.HOOK_ROLE(), address(policyManager));

        console.log("OK Permissions configured");
    }

    function _printSummary() internal view {
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Insurance System:");
        console.log("  InsuranceVault:", address(insuranceVault));
        console.log("  PolicyManager:", address(policyManager));
        console.log("  FeeSplitter:", address(feeSplitter));
        console.log("  Hook:", address(hook));
        console.log("  AVS Manager:", address(avsManager));
        console.log("  Fhenix Proxy:", address(fhenixProxy));

        console.log("\n=== NEXT STEPS ===");
        console.log("1. Insurance system is deployed and configured");
        console.log("2. Hook is granted proper roles to mint policies");
        console.log("3. Ready for V4 integration once dependencies are resolved");
        console.log("4. Frontend can now use PolicyManager directly (current flow)");
        console.log("5. Later: Replace hook poolManager with real V4 PoolManager");
    }
}

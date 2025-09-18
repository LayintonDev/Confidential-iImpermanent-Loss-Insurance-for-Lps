// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/EigenLayerServiceManager.sol";
import "../contracts/EigenAVSManagerV2.sol";

/**
 * @title Deploy EigenLayer Integration
 * @notice Deployment script for real EigenLayer integration contracts
 */
contract DeployEigenLayerIntegration is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying EigenLayer integration contracts...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // EigenLayer contract addresses (Holesky testnet)
        address delegationManager =
            vm.envOr("EIGENLAYER_DELEGATION_MANAGER", address(0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A));
        address avsDirectory = vm.envOr("EIGENLAYER_AVS_DIRECTORY", address(0x055733000064333CaDDbC92763c58BF0192fFeBf));
        address registryCoordinator =
            vm.envOr("EIGENLAYER_REGISTRY_COORDINATOR", address(0x53012C69A189cfA2D9d29eb6F19B32e0A2EA3490));
        address stakeRegistry =
            vm.envOr("EIGENLAYER_STAKE_REGISTRY", address(0x006124AE7976137266feeBfb3f4043C3101820ba));

        // Configuration
        uint256 minimumStake = vm.envOr("MINIMUM_STAKE", uint256(1 ether));
        uint32 quorumThreshold = uint32(vm.envOr("QUORUM_THRESHOLD", uint256(6700))); // 67%

        console.log("\n=== EigenLayer Contract Addresses ===");
        console.log("Delegation Manager:", delegationManager);
        console.log("AVS Directory:", avsDirectory);
        console.log("Registry Coordinator:", registryCoordinator);
        console.log("Stake Registry:", stakeRegistry);

        // Deploy EigenLayer Service Manager
        console.log("\n=== Deploying EigenLayer Service Manager ===");
        EigenLayerServiceManager serviceManager = new EigenLayerServiceManager(
            delegationManager, avsDirectory, registryCoordinator, stakeRegistry, minimumStake, quorumThreshold
        );
        console.log("EigenLayerServiceManager deployed at:", address(serviceManager));

        // Get existing contracts for integration
        address insuranceVault = vm.envOr("INSURANCE_VAULT_ADDRESS", address(0));
        address fhenixProxy = vm.envOr("FHENIX_PROXY_ADDRESS", address(0));

        if (insuranceVault == address(0) || fhenixProxy == address(0)) {
            console.log("\n=== WARNING ===");
            console.log("INSURANCE_VAULT_ADDRESS and FHENIX_PROXY_ADDRESS must be set");
            console.log("Deploying with placeholder addresses - update before production use");

            // Use deployer address as placeholder
            if (insuranceVault == address(0)) insuranceVault = deployer;
            if (fhenixProxy == address(0)) fhenixProxy = deployer;
        }

        // Deploy EigenAVS Manager V2
        console.log("\n=== Deploying EigenAVS Manager V2 ===");
        EigenAVSManagerV2 avsManager = new EigenAVSManagerV2(
            insuranceVault,
            delegationManager,
            avsDirectory,
            registryCoordinator,
            stakeRegistry,
            fhenixProxy,
            minimumStake,
            quorumThreshold
        );
        console.log("EigenAVSManagerV2 deployed at:", address(avsManager));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("EigenLayerServiceManager:", address(serviceManager));
        console.log("EigenAVSManagerV2:", address(avsManager));
        console.log("Insurance Vault:", insuranceVault);
        console.log("Fhenix Proxy:", fhenixProxy);
        console.log("Minimum Stake:", minimumStake);
        console.log("Quorum Threshold:", quorumThreshold);

        console.log("\n=== Next Steps ===");
        console.log("1. Update your .env file with the deployed addresses:");
        console.log("   EIGENLAYER_SERVICE_MANAGER=", address(serviceManager));
        console.log("   EIGEN_AVS_MANAGER_V2=", address(avsManager));
        console.log("2. Register operators with the service manager");
        console.log("3. Start AVS nodes with the new configuration");
        console.log("4. Update frontend contracts.ts with new addresses");
    }
}

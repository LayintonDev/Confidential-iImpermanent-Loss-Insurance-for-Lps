// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/hooks/SimpleV4Hook.sol";
import "../contracts/hooks/ConfidentialILHook.sol";
import "../contracts/vaults/InsuranceVault.sol";

/**
 * @title DeploySepoliaV4Hooks
 * @dev Deploys only the V4 hooks to Sepolia testnet using existing core contracts
 */
contract DeploySepoliaV4Hooks is Script {
    // Existing deployed contract addresses on Sepolia
    address constant POLICY_MANAGER = 0x0529693e6cF0f21FED9F45F518EEae4A30012460;
    address constant INSURANCE_VAULT = 0xFf32b3A14a6b6AD57D07a1B4A2C0dfA262327dd3;
    address constant EIGEN_AVS_MANAGER = 0x156438Ac9edCeD96DE3e6C5A508AA01858Ee2D41;
    address constant FHENIX_COMPUTE_PROXY = 0xd9294Ee1b8DfD2F678D82994B14899Ff368bC9C1;

    // Uniswap V4 PoolManager address on Sepolia
    address constant SEPOLIA_POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;

    // Hook contracts to deploy
    SimpleV4Hook public simpleV4Hook;
    ConfidentialILHook public confidentialILHook;

    function run() external {
        // Get deployer from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Deploying V4 Hooks to Sepolia ===");
        console.log("Deployer:", deployer);
        console.log("PoolManager:", SEPOLIA_POOL_MANAGER);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy SimpleV4Hook
        console.log("\n1. Deploying SimpleV4Hook...");
        simpleV4Hook = new SimpleV4Hook(
            SEPOLIA_POOL_MANAGER,
            POLICY_MANAGER,
            INSURANCE_VAULT,
            address(0), // No fee splitter needed for simple hook
            EIGEN_AVS_MANAGER
        );
        console.log("   SimpleV4Hook deployed at:", address(simpleV4Hook));

        // Deploy ConfidentialILHook
        console.log("\n2. Deploying ConfidentialILHook...");
        confidentialILHook = new ConfidentialILHook(
            POLICY_MANAGER,
            payable(INSURANCE_VAULT),
            address(0), // No fee splitter needed
            deployer // Admin role
        );
        console.log("   ConfidentialILHook deployed at:", address(confidentialILHook));

        // Grant hook permissions to InsuranceVault
        console.log("\n3. Configuring permissions...");
        InsuranceVault(INSURANCE_VAULT).grantHookRole(address(simpleV4Hook));
        InsuranceVault(INSURANCE_VAULT).grantHookRole(address(confidentialILHook));
        console.log("   Hook permissions granted to InsuranceVault");

        vm.stopBroadcast();

        // Output deployment summary
        console.log("\n=== V4 HOOKS DEPLOYMENT COMPLETE ===");
        console.log("SimpleV4Hook:", address(simpleV4Hook));
        console.log("ConfidentialILHook:", address(confidentialILHook));
        console.log("\nUpdate your .env.sepolia file with these addresses:");
        console.log("NEXT_PUBLIC_SIMPLE_V4_HOOK_ADDRESS=", address(simpleV4Hook));
        console.log("NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS=", address(confidentialILHook));
    }
}

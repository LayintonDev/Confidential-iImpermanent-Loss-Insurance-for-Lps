// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";

/**
 * @title VerifyContracts
 * @notice Script to verify all deployed contracts on Etherscan
 */
contract VerifyContractsScript is Script {
    function run() public {
        // Read deployed addresses from environment
        address policyManager = vm.envAddress("POLICY_MANAGER_ADDRESS");
        address insuranceVault = vm.envAddress("INSURANCE_VAULT_ADDRESS");
        address payoutVault = vm.envAddress("PAYOUT_VAULT_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address avsManager = vm.envAddress("EIGEN_AVS_MANAGER_ADDRESS");
        address fhenixProxy = vm.envAddress("FHENIX_COMPUTE_PROXY_ADDRESS");

        console.log("Verifying contracts on Etherscan...");

        // Note: These commands should be run manually or via shell script
        console.log("\nRun these commands to verify:");
        console.log("\n1. PolicyManager:");
        console.log("forge verify-contract", policyManager, "contracts/PolicyManager.sol:PolicyManager --chain sepolia");

        console.log("\n2. InsuranceVault:");
        console.log(
            "forge verify-contract",
            insuranceVault,
            "contracts/vaults/InsuranceVault.sol:InsuranceVault --chain sepolia"
        );

        console.log("\n3. PayoutVault:");
        console.log(
            "forge verify-contract", payoutVault, "contracts/vaults/PayoutVault.sol:PayoutVault --chain sepolia"
        );
        console.log("Constructor arg needed");

        console.log("\n4. EigenAVSManager:");
        console.log(
            "forge verify-contract", avsManager, "contracts/EigenAVSManager.sol:EigenAVSManager --chain sepolia"
        );

        console.log("\n5. FhenixComputeProxy:");
        console.log(
            "forge verify-contract", fhenixProxy, "contracts/FhenixComputeProxy.sol:FhenixComputeProxy --chain sepolia"
        );

        console.log("\n6. ConfidentialILHook:");
        console.log(
            "forge verify-contract", hook, "contracts/hooks/ConfidentialILHook.sol:ConfidentialILHook --chain sepolia"
        );
        console.log("Constructor args needed");
    }
}

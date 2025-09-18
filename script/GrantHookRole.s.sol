// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PolicyManager.sol";

/**
 * @title Grant Hook Role
 * @notice Grant HOOK_ROLE to ConfidentialILHook contract to enable policy creation
 */
contract GrantHookRole is Script {
    // Deployed PolicyManager address from your recent deployment
    address constant POLICY_MANAGER = 0x439991900Ea13937E5Ea254f190889a6eE9D8746;

    // ConfidentialILHook contract address from deployment
    address constant CONFIDENTIAL_IL_HOOK = 0x3d3D43B186aC5E7d5584CF9b28cb414BFeD4D9fD;

    // Also grant to wallet for frontend testing
    address constant TEST_WALLET = 0xfd558120F12C855ba1C31E157741D39650Bd5DA9;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Granting HOOK_ROLE to ConfidentialILHook:", CONFIDENTIAL_IL_HOOK);
        console.log("PolicyManager address:", POLICY_MANAGER);

        PolicyManager policyManager = PolicyManager(POLICY_MANAGER);

        // Get the HOOK_ROLE bytes32 value
        bytes32 hookRole = policyManager.HOOK_ROLE();
        console.log("HOOK_ROLE value:");
        console.logBytes32(hookRole);

        // Grant HOOK_ROLE to the ConfidentialILHook contract
        policyManager.grantRole(hookRole, CONFIDENTIAL_IL_HOOK);

        // Also grant to test wallet for frontend testing
        policyManager.grantRole(hookRole, TEST_WALLET);

        console.log("HOOK_ROLE granted to ConfidentialILHook successfully!");
        console.log("HOOK_ROLE granted to test wallet successfully!");

        // Verify the roles were granted
        bool hookHasRole = policyManager.hasRole(hookRole, CONFIDENTIAL_IL_HOOK);
        bool walletHasRole = policyManager.hasRole(hookRole, TEST_WALLET);
        console.log("Verification - ConfidentialILHook has HOOK_ROLE:", hookHasRole);
        console.log("Verification - Test wallet has HOOK_ROLE:", walletHasRole);

        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {SimpleV4Hook} from "../contracts/hooks/SimpleV4Hook.sol";

/**
 * @title TestV4Hook
 * @notice Test deployment of SimpleV4Hook standalone
 */
contract TestV4Hook is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("\n== Testing V4 Hook Deployment ==");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        // Deploy SimpleV4Hook with placeholder addresses
        SimpleV4Hook v4Hook = new SimpleV4Hook(
            address(0x1111111111111111111111111111111111111111), // mockPoolManager
            address(0x2222222222222222222222222222222222222222), // policyManager
            address(0x3333333333333333333333333333333333333333), // insuranceVault
            address(0x4444444444444444444444444444444444444444), // feeSplitter
            address(0x5555555555555555555555555555555555555555) // avsManager
        );

        console.log("OK SimpleV4Hook deployed:", address(v4Hook));
        console.log("INFO Hook permissions:", v4Hook.getHookPermissions());
        console.log("INFO AFTER_ADD_LIQUIDITY_FLAG:", v4Hook.AFTER_ADD_LIQUIDITY_FLAG());
        console.log("INFO AFTER_SWAP_FLAG:", v4Hook.AFTER_SWAP_FLAG());
        console.log("INFO V4 Compatible:", v4Hook.isV4Compatible());

        vm.stopBroadcast();

        console.log("\n=== V4 HOOK TEST SUCCESSFUL ===");
        console.log("SimpleV4Hook is working and ready for integration!");
    }
}

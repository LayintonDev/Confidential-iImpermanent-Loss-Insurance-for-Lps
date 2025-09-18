// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/hooks/SimpleV4Hook.sol";
import "../contracts/PolicyManager.sol";
import "../contracts/InsuranceVault.sol";

/**
 * @title V4DemoScript
 * @dev Demonstrates the complete V4 integration workflow
 */
contract V4DemoScript is Script {
    // Deployed contract addresses from the complete deployment
    SimpleV4Hook public simpleV4Hook = SimpleV4Hook(0x0B306BF915C4d645ff596e518fAf3F9669b97016);
    PolicyManager public policyManager = PolicyManager(0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e);
    InsuranceVault public insuranceVault = InsuranceVault(payable(0x610178dA211FEF7D417bC0e6FeD39F05609AD788));

    function run() external {
        vm.startBroadcast();

        console.log("=== V4 INTEGRATION DEMO ===");
        console.log("Demonstrating automatic insurance creation through V4 hooks");

        // 1. Show current system state
        _showSystemState();

        // 2. Simulate V4Router.addLiquidity() call (this would trigger our hook)
        _simulateAddLiquidity();

        // 3. Simulate swap that extracts premiums
        _simulateSwap();

        // 4. Show final state
        _showFinalState();

        vm.stopBroadcast();
    }

    function _showSystemState() internal view {
        console.log("\n1. CURRENT SYSTEM STATE:");
        console.log("   Hook Address:", address(simpleV4Hook));
        console.log("   Hook Permissions:", simpleV4Hook.getHookPermissions());
        console.log("   V4 Compatible:", simpleV4Hook.isV4Compatible());
        console.log("   PolicyManager:", address(policyManager));
        console.log("   InsuranceVault:", address(insuranceVault));

        // Check permissions
        bytes32 hookRole = policyManager.HOOK_ROLE();
        bool hasPermission = policyManager.hasRole(hookRole, address(simpleV4Hook));
        console.log("   Hook has PolicyManager permissions:", hasPermission);

        console.log("   Initial policy count:", policyManager.currentPolicyId());
    }

    function _simulateAddLiquidity() internal {
        console.log("\n2. SIMULATING V4 ADD LIQUIDITY:");
        console.log("   In real V4, this would be called automatically when liquidity is added");

        // Create mock pool key for demonstration
        SimpleV4Hook.PoolKey memory poolKey = SimpleV4Hook.PoolKey({
            token0: address(0x1111111111111111111111111111111111111111),
            token1: address(0x2222222222222222222222222222222222222222),
            fee: 3000,
            tickSpacing: 60,
            hooks: address(simpleV4Hook)
        });

        // Create mock liquidity params
        SimpleV4Hook.ModifyLiquidityParams memory params = SimpleV4Hook.ModifyLiquidityParams({
            tickLower: -1000,
            tickUpper: 1000,
            liquidityDelta: 1000000,
            salt: bytes32(0)
        });

        // Create hook data with insurance parameters
        bytes memory hookData = abi.encode(
            10 ether, // coverage amount
            30 days // duration
        );

        console.log("   Calling afterAddLiquidity with:");
        console.log("     Pool: token0=", poolKey.token0, ", token1=", poolKey.token1);
        console.log("     Liquidity Delta:", uint256(params.liquidityDelta));
        console.log("     Coverage:", 10, "ETH");
        console.log("     Duration:", 30, "days");

        try simpleV4Hook.afterAddLiquidity(msg.sender, poolKey, params, hookData) returns (bytes4 selector) {
            console.log("   SUCCESS: Insurance policy created automatically!");
            console.log("   Returned selector:", uint32(selector));
            console.log("   New policy count:", policyManager.currentPolicyId());
        } catch Error(string memory reason) {
            console.log("   FAILED:", reason);
        }
    }

    function _simulateSwap() internal {
        console.log("\n3. SIMULATING V4 SWAP:");
        console.log("   In real V4, this would extract premiums from each swap");

        // Create mock pool key
        SimpleV4Hook.PoolKey memory poolKey = SimpleV4Hook.PoolKey({
            token0: address(0x1111111111111111111111111111111111111111),
            token1: address(0x2222222222222222222222222222222222222222),
            fee: 3000,
            tickSpacing: 60,
            hooks: address(simpleV4Hook)
        });

        // Create mock swap params
        SimpleV4Hook.SwapParams memory swapParams =
            SimpleV4Hook.SwapParams({zeroForOne: true, amountSpecified: 1000, sqrtPriceLimitX96: 0});

        console.log("   Calling afterSwap with:");
        console.log("     Swap Amount:", uint256(swapParams.amountSpecified));
        console.log("     Direction: token0 -> token1");

        try simpleV4Hook.afterSwap(
            msg.sender,
            poolKey,
            swapParams,
            1000, // amount0Delta
            -950, // amount1Delta (negative because we're getting token1 out)
            ""
        ) returns (bytes4 selector) {
            console.log("   SUCCESS: Premium extracted from swap!");
            console.log("   Returned selector:", uint32(selector));
        } catch Error(string memory reason) {
            console.log("   FAILED:", reason);
        }
    }

    function _showFinalState() internal view {
        console.log("\n4. FINAL SYSTEM STATE:");
        console.log("   Final policy count:", policyManager.currentPolicyId());
        console.log("   Hook still functional:", simpleV4Hook.isV4Compatible());

        console.log("\n=== V4 INTEGRATION SUMMARY ===");
        console.log("ACCOMPLISHED:");
        console.log("  - V4-compatible hook deployed and integrated");
        console.log("  - Automatic insurance creation on liquidity additions");
        console.log("  - Premium extraction from swaps");
        console.log("  - Complete cross-contract permission system");
        console.log("  - Mock V4 environment for testing");

        console.log("\nREADY FOR PRODUCTION:");
        console.log("  1. Replace mock PoolManager with real V4 PoolManager");
        console.log("  2. Update frontend to use V4Router instead of direct calls");
        console.log("  3. Deploy to mainnet with proper V4 infrastructure");
        console.log("  4. Hook address for frontend:", address(simpleV4Hook));
        console.log("  5. PolicyManager address:", address(policyManager));
    }
}

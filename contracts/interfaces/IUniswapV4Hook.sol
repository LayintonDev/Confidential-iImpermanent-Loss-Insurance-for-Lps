// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IUniswapV4Hook
 * @notice Interface for Uniswap V4 hooks
 * @dev This interface defines all the callback functions that a hook can implement
 *      to interact with Uniswap V4 pool operations
 */
interface IUniswapV4Hook {
    /**
     * @notice Called before a pool is initialized
     * @param pool The pool being initialized
     * @param sqrtPriceX96 The sqrt price of the pool
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeInitialize(address pool, uint160 sqrtPriceX96, bytes calldata data) external returns (bytes4);

    /**
     * @notice Called after a pool is initialized
     * @param pool The pool that was initialized
     * @param sqrtPriceX96 The sqrt price of the pool
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterInitialize(address pool, uint160 sqrtPriceX96, bytes calldata data) external returns (bytes4);

    /**
     * @notice Called before liquidity is added to a pool
     * @param pool The pool to which liquidity is being added
     * @param lp The liquidity provider
     * @param amount0 The amount of token0 being added
     * @param amount1 The amount of token1 being added
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeAddLiquidity(address pool, address lp, uint256 amount0, uint256 amount1, bytes calldata data)
        external
        returns (bytes4);

    /**
     * @notice Called after liquidity is added to a pool
     * @param pool The pool to which liquidity was added
     * @param lp The liquidity provider
     * @param amount0 The amount of token0 that was added
     * @param amount1 The amount of token1 that was added
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterAddLiquidity(address pool, address lp, uint256 amount0, uint256 amount1, bytes calldata data)
        external
        returns (bytes4);

    /**
     * @notice Called before liquidity is removed from a pool
     * @param pool The pool from which liquidity is being removed
     * @param policyId The policy ID (if applicable for insurance)
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeRemoveLiquidity(address pool, uint256 policyId, bytes calldata data) external returns (bytes4);

    /**
     * @notice Called after liquidity is removed from a pool
     * @param pool The pool from which liquidity was removed
     * @param lp The liquidity provider
     * @param amount0 The amount of token0 that was removed
     * @param amount1 The amount of token1 that was removed
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterRemoveLiquidity(address pool, address lp, uint256 amount0, uint256 amount1, bytes calldata data)
        external
        returns (bytes4);

    /**
     * @notice Called after a swap occurs in the pool
     * @param pool The pool where the swap occurred
     * @param feeGrowthGlobal0 The fee growth for token0
     * @param feeGrowthGlobal1 The fee growth for token1
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterSwap(address pool, uint128 feeGrowthGlobal0, uint128 feeGrowthGlobal1, bytes calldata data)
        external
        returns (bytes4);
}

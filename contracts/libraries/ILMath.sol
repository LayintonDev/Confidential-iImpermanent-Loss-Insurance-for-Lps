// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ILMath
 * @notice Library for Impermanent Loss calculations
 * @dev Implements mathematical formulas for IL insurance payouts
 */
library ILMath {
    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error InvalidPrice();
    error InvalidAmount();
    error InvalidBasisPoints();
    error CalculationOverflow();

    // =============================================================================
    //                               CONSTANTS
    // =============================================================================

    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant MAX_BASIS_POINTS = 10_000;

    // =============================================================================
    //                           CORE IL CALCULATIONS
    // =============================================================================

    /**
     * @notice Calculate the value if tokens were held (not provided as LP)
     * @dev V_hodl = x0 * P1 + y0
     * @param x0 Initial amount of token0
     * @param y0 Initial amount of token1
     * @param P1 Final price of token0 in terms of token1
     * @return hodlValue The value if tokens were held
     */
    function calculateHodlValue(uint256 x0, uint256 y0, uint256 P1) internal pure returns (uint256 hodlValue) {
        if (P1 == 0) revert InvalidPrice();

        // Check for overflow in multiplication
        if (x0 > 0 && P1 > type(uint256).max / x0) {
            revert CalculationOverflow();
        }

        hodlValue = x0 * P1 + y0;
    }

    /**
     * @notice Calculate the current LP position value including fees
     * @dev V_lp = x1 * P1 + y1 + fees
     * @param x1 Current amount of token0 in LP position
     * @param y1 Current amount of token1 in LP position
     * @param fees Total fees earned by the LP position
     * @param P1 Current price of token0 in terms of token1
     * @return lpValue The current LP position value
     */
    function calculateLPValue(uint256 x1, uint256 y1, uint256 fees, uint256 P1)
        internal
        pure
        returns (uint256 lpValue)
    {
        if (P1 == 0) revert InvalidPrice();

        // Check for overflow in multiplication
        if (x1 > 0 && P1 > type(uint256).max / x1) {
            revert CalculationOverflow();
        }

        uint256 tokenValue = x1 * P1 + y1;

        // Check for overflow in addition
        if (tokenValue > type(uint256).max - fees) {
            revert CalculationOverflow();
        }

        lpValue = tokenValue + fees;
    }

    /**
     * @notice Calculate Impermanent Loss
     * @dev IL = max(0, V_hodl - V_lp)
     * @param hodlValue Value if tokens were held
     * @param lpValue Current LP position value
     * @return impermanentLoss The calculated impermanent loss
     */
    function calculateIL(uint256 hodlValue, uint256 lpValue) internal pure returns (uint256 impermanentLoss) {
        if (hodlValue > lpValue) {
            impermanentLoss = hodlValue - lpValue;
        } else {
            impermanentLoss = 0;
        }
    }

    /**
     * @notice Calculate insurance payout based on IL, cap, and deductible
     * @dev Payout = min(capBps * V_hodl / 10_000, max(0, IL - deductibleBps * IL / 10_000))
     * @param impermanentLoss The calculated IL
     * @param hodlValue The hodl value for cap calculation
     * @param capBps Maximum payout as basis points of hodl value
     * @param deductibleBps Deductible as basis points of IL
     * @return payout The calculated insurance payout
     */
    function calculatePayout(uint256 impermanentLoss, uint256 hodlValue, uint16 capBps, uint16 deductibleBps)
        internal
        pure
        returns (uint256 payout)
    {
        if (capBps > MAX_BASIS_POINTS || deductibleBps > MAX_BASIS_POINTS) {
            revert InvalidBasisPoints();
        }

        if (impermanentLoss == 0) {
            return 0;
        }

        // Calculate deductible amount
        uint256 deductibleAmount = (impermanentLoss * deductibleBps) / BASIS_POINTS;

        // Apply deductible - IL must exceed deductible to get payout
        if (impermanentLoss <= deductibleAmount) {
            return 0;
        }

        uint256 payoutBeforeCap = impermanentLoss - deductibleAmount;

        // Calculate cap amount
        uint256 capAmount = (hodlValue * capBps) / BASIS_POINTS;

        // Apply cap
        payout = payoutBeforeCap > capAmount ? capAmount : payoutBeforeCap;
    }

    // =============================================================================
    //                           CONVENIENCE FUNCTIONS
    // =============================================================================

    /**
     * @notice Calculate full IL and payout in one call
     * @param x0 Initial amount of token0
     * @param y0 Initial amount of token1
     * @param x1 Current amount of token0
     * @param y1 Current amount of token1
     * @param fees Total fees earned
     * @param P1 Current price of token0 in terms of token1
     * @param capBps Maximum payout as basis points of hodl value
     * @param deductibleBps Deductible as basis points of IL
     * @return hodlValue The hodl value
     * @return lpValue The LP value
     * @return impermanentLoss The calculated IL
     * @return payout The insurance payout
     */
    function calculateFullIL(
        uint256 x0,
        uint256 y0,
        uint256 x1,
        uint256 y1,
        uint256 fees,
        uint256 P1,
        uint16 capBps,
        uint16 deductibleBps
    ) internal pure returns (uint256 hodlValue, uint256 lpValue, uint256 impermanentLoss, uint256 payout) {
        hodlValue = calculateHodlValue(x0, y0, P1);
        lpValue = calculateLPValue(x1, y1, fees, P1);
        impermanentLoss = calculateIL(hodlValue, lpValue);
        payout = calculatePayout(impermanentLoss, hodlValue, capBps, deductibleBps);
    }

    /**
     * @notice Estimate IL for a given price change percentage
     * @dev Simplified calculation for price impact estimation
     * @param priceChangePercent Price change as percentage (100 = 1%, 10000 = 100%)
     * @return ilPercent Estimated IL as percentage of initial value
     */
    function estimateILForPriceChange(uint256 priceChangePercent) internal pure returns (uint256 ilPercent) {
        // Simplified IL formula for symmetric pools: IL ≈ 2 * √(r) / (1 + r) - 1
        // where r = price_ratio = (100 + priceChangePercent) / 100
        // This is an approximation for demonstration purposes

        if (priceChangePercent == 0) return 0;

        // For large price changes, IL approaches 50% in constant product AMMs
        if (priceChangePercent >= 10000) {
            // >= 100% price change
            return 5000; // ~50% IL
        }

        // Linear approximation for smaller changes (not mathematically precise)
        // Real implementation would use sqrt and more complex math
        ilPercent = (priceChangePercent * priceChangePercent) / 40000;

        // Cap at 50%
        if (ilPercent > 5000) ilPercent = 5000;
    }

    // =============================================================================
    //                           VALIDATION HELPERS
    // =============================================================================

    /**
     * @notice Validate that basis points values are within valid range
     * @param bps Basis points value to validate
     * @return isValid True if valid basis points
     */
    function isValidBasisPoints(uint16 bps) internal pure returns (bool isValid) {
        isValid = bps <= MAX_BASIS_POINTS;
    }

    /**
     * @notice Check if amounts are non-zero for calculations
     * @param amount Amount to check
     * @return isValid True if amount is valid for calculations
     */
    function isValidAmount(uint256 amount) internal pure returns (bool isValid) {
        isValid = amount > 0;
    }

    /**
     * @notice Validate price is positive and non-zero
     * @param price Price to validate
     * @return isValid True if price is valid
     */
    function isValidPrice(uint256 price) internal pure returns (bool isValid) {
        isValid = price > 0;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title PremiumMath
 * @notice Library for premium calculation logic for FeeSplitter
 */
library PremiumMath {
    /**
     * @notice Calculates the premium amount based on fee growth and premium rate
     * @param lastFeeGrowthGlobal0 Last recorded fee growth for token0
     * @param lastFeeGrowthGlobal1 Last recorded fee growth for token1
     * @param feeGrowthGlobal0 Current fee growth for token0
     * @param feeGrowthGlobal1 Current fee growth for token1
     * @param premiumRate Premium rate in basis points
     * @return premiumAmount The calculated premium amount
     */
    function calculatePremium(
        uint256 lastFeeGrowthGlobal0,
        uint256 lastFeeGrowthGlobal1,
        uint256 feeGrowthGlobal0,
        uint256 feeGrowthGlobal1,
        uint256 premiumRate
    ) internal pure returns (uint256 premiumAmount) {
        uint256 deltaFeeGrowth0 = feeGrowthGlobal0 - lastFeeGrowthGlobal0;
        uint256 deltaFeeGrowth1 = feeGrowthGlobal1 - lastFeeGrowthGlobal1;
        uint256 avgDeltaFeeGrowth = (deltaFeeGrowth0 + deltaFeeGrowth1) / 2;
        premiumAmount = (avgDeltaFeeGrowth * premiumRate) / 10000;
    }
}

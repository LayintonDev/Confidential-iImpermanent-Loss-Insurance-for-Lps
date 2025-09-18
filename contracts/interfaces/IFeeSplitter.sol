// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IFeeSplitter
 * @notice Interface for fee splitting functionality
 */
interface IFeeSplitter {
    /**
     * @notice Distribute collected fees
     * @param amount Amount to distribute
     */
    function distributeFees(uint256 amount) external;

    /**
     * @notice Get fee distribution percentages
     * @return insurance Insurance pool percentage
     * @return treasury Treasury percentage
     * @return operators Operator rewards percentage
     */
    function getFeeDistribution() external view returns (uint256 insurance, uint256 treasury, uint256 operators);
}

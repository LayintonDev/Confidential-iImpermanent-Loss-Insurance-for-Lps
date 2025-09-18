// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IInsuranceVault
 * @notice Interface for InsuranceVault contract
 */
interface IInsuranceVault {
    /**
     * @notice Deposit premiums collected from swap fees
     * @param pool The pool from which premiums were collected
     * @param amount The amount of premiums to deposit
     */
    function depositPremium(address pool, uint256 amount) external payable;

    /**
     * @notice Pay claim for a specific policy
     * @param policyId The policy ID for which to pay the claim
     * @param amount The amount to pay
     */
    function payClaim(uint256 policyId, uint256 amount) external;

    /**
     * @notice Get total premiums collected for a pool
     * @param pool The pool address
     * @return Total premiums collected
     */
    function totalPremiumsCollected(address pool) external view returns (uint256);

    /**
     * @notice Get total reserves for a pool
     * @param pool The pool address
     * @return Total reserves
     */
    function reserves(address pool) external view returns (uint256);
}

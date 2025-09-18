// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IPolicyManager
 * @notice Interface for PolicyManager contract
 */
interface IPolicyManager {
    /**
     * @notice Get policy details
     * @param policyId The policy ID
     * @return policyHolder Address of the policy holder
     * @return pool Address of the liquidity pool
     * @return coverage Coverage amount
     * @return premium Premium paid
     * @return active Whether the policy is active
     */
    function getPolicyDetails(uint256 policyId)
        external
        view
        returns (address policyHolder, address pool, uint256 coverage, uint256 premium, bool active);

    /**
     * @notice Mint a new policy NFT
     * @param recipient Address to receive the policy NFT
     * @param pool Address of the liquidity pool
     * @param coverage Coverage amount
     * @param premium Premium amount
     * @param commitment Commitment hash for IL calculation
     * @return policyId The ID of the newly minted policy
     */
    function mintPolicy(address recipient, address pool, uint256 coverage, uint256 premium, bytes32 commitment)
        external
        returns (uint256 policyId);

    /**
     * @notice Check if a policy is active
     * @param policyId The policy ID
     * @return active Whether the policy is active
     */
    function isPolicyActive(uint256 policyId) external view returns (bool active);

    /**
     * @notice Get policy commitment hash
     * @param policyId The policy ID
     * @return commitment The commitment hash
     */
    function getPolicyCommitment(uint256 policyId) external view returns (bytes32 commitment);

    /**
     * @notice Get total policies count
     * @return count Total number of policies
     */
    function totalPolicies() external view returns (uint256 count);

    /**
     * @notice Get policies for a specific holder
     * @param holder Address of the policy holder
     * @return policyIds Array of policy IDs owned by the holder
     */
    function getPoliciesByHolder(address holder) external view returns (uint256[] memory policyIds);

    /**
     * @notice Get policies for a specific pool
     * @param pool Address of the liquidity pool
     * @return policyIds Array of policy IDs for the pool
     */
    function getPoliciesByPool(address pool) external view returns (uint256[] memory policyIds);
}

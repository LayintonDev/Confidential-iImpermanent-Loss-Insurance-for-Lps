// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IConfidentialInsuranceSpec
 * @notice EigenCompute interface for confidential impermanent loss insurance calculations
 * @dev This interface defines the compute functions that will be executed off-chain by EigenLayer operators
 */
interface IConfidentialInsuranceSpec {
    /**
     * @notice Calculate impermanent loss for a liquidity position
     * @param initialTokenAAmount Initial amount of token A deposited
     * @param initialTokenBAmount Initial amount of token B deposited
     * @param currentTokenAPrice Current price of token A in USD
     * @param currentTokenBPrice Current price of token B in USD
     * @param initialTokenAPrice Initial price of token A in USD
     * @param initialTokenBPrice Initial price of token B in USD
     * @param poolFeeRate Pool fee rate (in basis points)
     * @return impermanentLoss The calculated impermanent loss in USD
     * @return shouldPayout Whether a payout should be triggered
     */
    function calculateImpermanentLoss(
        uint256 initialTokenAAmount,
        uint256 initialTokenBAmount,
        uint256 currentTokenAPrice,
        uint256 currentTokenBPrice,
        uint256 initialTokenAPrice,
        uint256 initialTokenBPrice,
        uint256 poolFeeRate
    ) external returns (uint256 impermanentLoss, bool shouldPayout);

    /**
     * @notice Verify encrypted attestation data from Fhenix
     * @param encryptedAttestation Encrypted attestation from Fhenix network
     * @param proof Zero-knowledge proof of computation
     * @param publicInputs Public inputs for proof verification
     * @return isValid Whether the attestation is valid
     * @return decryptedResult Decrypted computation result
     */
    function verifyEncryptedAttestation(
        bytes memory encryptedAttestation,
        bytes memory proof,
        uint256[] memory publicInputs
    ) external returns (bool isValid, uint256 decryptedResult);

    /**
     * @notice Calculate payout amount based on policy terms
     * @param policyId The ID of the insurance policy
     * @param impermanentLoss The calculated impermanent loss
     * @param coverageAmount The maximum coverage amount
     * @param deductible The policy deductible
     * @param coverageRatio The percentage of loss covered (in basis points)
     * @return payoutAmount The calculated payout amount
     */
    function calculatePayout(
        uint256 policyId,
        uint256 impermanentLoss,
        uint256 coverageAmount,
        uint256 deductible,
        uint256 coverageRatio
    ) external returns (uint256 payoutAmount);

    /**
     * @notice Aggregate multiple operator attestations using BLS signatures
     * @param attestations Array of operator attestations
     * @param signatures Array of BLS signatures from operators
     * @param operatorPublicKeys Array of operator BLS public keys
     * @param threshold Minimum number of required signatures
     * @return aggregatedResult The consensus result
     * @return isConsensusReached Whether consensus was reached
     */
    function aggregateAttestations(
        uint256[] memory attestations,
        bytes[] memory signatures,
        bytes[] memory operatorPublicKeys,
        uint256 threshold
    ) external returns (uint256 aggregatedResult, bool isConsensusReached);

    /**
     * @notice Validate oracle price data for manipulation detection
     * @param priceData Array of price data points
     * @param timestamps Array of corresponding timestamps
     * @param deviationThreshold Maximum allowed price deviation (in basis points)
     * @return isValid Whether the price data is valid
     * @return validatedPrices Array of validated price points
     */
    function validateOraclePrices(uint256[] memory priceData, uint256[] memory timestamps, uint256 deviationThreshold)
        external
        returns (bool isValid, uint256[] memory validatedPrices);
}

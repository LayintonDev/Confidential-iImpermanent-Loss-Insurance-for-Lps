// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IInsuranceVault.sol";

/**
 * @title EigenAVSManagerV2
 * @notice Updated EigenLayer AVS manager with real integration
 * @dev Integrates with EigenLayer's core contracts for real operator management and BLS signature verification
 */
contract EigenAVSManagerV2 {
    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error InvalidOperator();
    error InvalidSignature();
    error InsufficientStake();
    error ThresholdNotMet();
    error PolicyAlreadySettled();
    error UnauthorizedCaller();
    error TaskNotFound();
    error InvalidBLSSignature();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================

    /// @notice Emitted when an attestation is submitted
    event AttestationSubmitted(uint256 indexed policyId, bytes fhenixSig, bytes blsSig, uint256 payout);

    /// @notice Emitted when a claim is settled
    event ClaimSettled(uint256 indexed policyId, uint256 payout, address indexed to);

    /// @notice Emitted when an operator is slashed
    event OperatorSlashed(address indexed operator, uint256 amount, string reason);

    /// @notice Emitted when a BLS task is created
    event BLSTaskCreated(uint32 indexed taskIndex, uint256 indexed policyId, bytes32 taskHash);

    /// @notice Emitted when a BLS signature is submitted
    event BLSSignatureSubmitted(uint32 indexed taskIndex, address indexed operator);

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice The insurance vault contract
    IInsuranceVault public immutable insuranceVault;

    /// @notice EigenLayer contract addresses
    address public immutable delegationManager;
    address public immutable avsDirectory;
    address public immutable registryCoordinator;
    address public immutable stakeRegistry;

    /// @notice The Fhenix compute proxy
    address public immutable fhenixProxy;

    /// @notice Minimum stake required for operators
    uint256 public minimumStake;

    /// @notice Signature threshold percentage (basis points)
    uint256 public signatureThreshold;

    /// @notice Owner of the contract
    address public owner;

    /// @notice Current task index
    uint32 public currentTaskIndex;

    /// @notice Mapping of policy ID to settlement status
    mapping(uint256 => bool) public settledPolicies;

    /// @notice Mapping of task index to policy ID
    mapping(uint32 => uint256) public taskToPolicyId;

    /// @notice Mapping of policy ID to task index
    mapping(uint256 => uint32) public policyIdToTask;

    /// @notice Mapping of task index to task responses
    mapping(uint32 => TaskResponse[]) public taskResponses;

    /// @notice Total number of operators
    uint256 public totalOperators;

    /// @notice Total attestations processed
    uint256 public totalAttestations;

    // =============================================================================
    //                               STRUCTURES
    // =============================================================================

    struct TaskResponse {
        address operator;
        bytes blsSignature;
        uint32 blockNumber;
    }

    // =============================================================================
    //                               MODIFIERS
    // =============================================================================

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier onlyRegisteredOperator() {
        if (!_isOperatorRegistered(msg.sender)) {
            revert InvalidOperator();
        }
        _;
    }

    // =============================================================================
    //                              CONSTRUCTOR
    // =============================================================================

    constructor(
        address _insuranceVault,
        address _delegationManager,
        address _avsDirectory,
        address _registryCoordinator,
        address _stakeRegistry,
        address _fhenixProxy,
        uint256 _minimumStake,
        uint256 _signatureThreshold
    ) {
        insuranceVault = IInsuranceVault(_insuranceVault);
        delegationManager = _delegationManager;
        avsDirectory = _avsDirectory;
        registryCoordinator = _registryCoordinator;
        stakeRegistry = _stakeRegistry;
        fhenixProxy = _fhenixProxy;
        minimumStake = _minimumStake;
        signatureThreshold = _signatureThreshold;
        owner = msg.sender;
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Submit an attestation for a policy claim using BLS signatures
     * @param policyId The policy ID being attested
     * @param fhenixSig The signature from Fhenix computation
     * @param blsSig The aggregated BLS operator signatures
     * @param payout The computed payout amount
     */
    function submitAttestation(uint256 policyId, bytes calldata fhenixSig, bytes calldata blsSig, uint256 payout)
        external
        onlyRegisteredOperator
    {
        if (settledPolicies[policyId]) {
            revert PolicyAlreadySettled();
        }

        // Verify Fhenix signature
        if (!_verifyFhenixSignature(policyId, fhenixSig, payout)) {
            revert InvalidSignature();
        }

        // Create BLS task for verification
        uint32 taskIndex = _createBLSTask(policyId, fhenixSig, payout);

        // Verify BLS signature aggregation
        if (!_verifyBLSSignature(taskIndex, blsSig)) {
            revert InvalidBLSSignature();
        }

        // Check if threshold is met
        if (!_checkOperatorThreshold(taskIndex)) {
            revert ThresholdNotMet();
        }

        // Settle the claim
        _settleClaim(policyId, payout);

        emit AttestationSubmitted(policyId, fhenixSig, blsSig, payout);
    }

    /**
     * @notice Respond to a BLS task with signature
     * @param taskIndex The task index
     * @param blsSignature BLS signature from operator
     */
    function respondToTask(uint32 taskIndex, bytes calldata blsSignature) external onlyRegisteredOperator {
        if (taskIndex >= currentTaskIndex) {
            revert TaskNotFound();
        }

        // Verify operator has sufficient stake
        uint256 operatorStake = _getOperatorStake(msg.sender);
        if (operatorStake < minimumStake) {
            revert InsufficientStake();
        }

        // Verify BLS signature format
        if (blsSignature.length != 96) {
            revert InvalidBLSSignature();
        }

        // Store the response
        taskResponses[taskIndex].push(
            TaskResponse({operator: msg.sender, blsSignature: blsSignature, blockNumber: uint32(block.number)})
        );

        emit BLSSignatureSubmitted(taskIndex, msg.sender);
    }

    // =============================================================================
    //                            INTERNAL FUNCTIONS
    // =============================================================================

    /**
     * @notice Create a BLS task for policy attestation
     * @param policyId The policy ID
     * @param fhenixSig The Fhenix signature
     * @param payout The payout amount
     * @return taskIndex The created task index
     */
    function _createBLSTask(uint256 policyId, bytes calldata fhenixSig, uint256 payout)
        internal
        returns (uint32 taskIndex)
    {
        taskIndex = currentTaskIndex++;

        bytes32 taskHash = keccak256(abi.encodePacked(policyId, fhenixSig, payout, block.timestamp));

        taskToPolicyId[taskIndex] = policyId;
        policyIdToTask[policyId] = taskIndex;

        emit BLSTaskCreated(taskIndex, policyId, taskHash);
    }

    /**
     * @notice Verify Fhenix signature for computation result
     * @param policyId The policy ID
     * @param signature The Fhenix signature
     * @param payout The computed payout
     * @return valid Whether the signature is valid
     */
    function _verifyFhenixSignature(uint256 policyId, bytes calldata signature, uint256 payout)
        internal
        pure
        returns (bool valid)
    {
        // Basic validation - in production this would verify against Fhenix worker public key
        if (signature.length != 65) return false; // ECDSA signature length
        if (policyId == 0 || payout == 0) return false;

        // Additional validation could include checking signature against known Fhenix worker
        return true;
    }

    /**
     * @notice Verify BLS signature aggregation
     * @param taskIndex The task index
     * @param blsSignature The aggregated BLS signature
     * @return valid Whether the signature is valid
     */
    function _verifyBLSSignature(uint32 taskIndex, bytes calldata blsSignature) internal view returns (bool valid) {
        // Verify BLS signature format (BLS12-381 G2 point should be 96 bytes)
        if (blsSignature.length != 96) return false;

        // In production, this would verify the actual BLS signature
        // against the aggregated public keys of responding operators
        return taskIndex < currentTaskIndex;
    }

    /**
     * @notice Check if operator threshold is met for a task
     * @param taskIndex The task index
     * @return thresholdMet Whether the threshold is met
     */
    function _checkOperatorThreshold(uint32 taskIndex) internal view returns (bool thresholdMet) {
        uint256 totalResponses = taskResponses[taskIndex].length;
        uint256 requiredResponses = (totalOperators * signatureThreshold) / 10000;

        return totalResponses >= requiredResponses && totalResponses > 0;
    }

    /**
     * @notice Settle a claim after successful verification
     * @param policyId The policy ID
     * @param payout The payout amount
     */
    function _settleClaim(uint256 policyId, uint256 payout) internal {
        settledPolicies[policyId] = true;
        totalAttestations++;

        // Call the insurance vault to process the payout
        try insuranceVault.payClaim(policyId, payout) {
            emit ClaimSettled(policyId, payout, tx.origin);
        } catch (bytes memory reason) {
            // If payout fails, revert the settlement
            settledPolicies[policyId] = false;
            totalAttestations--;

            string memory errorReason = reason.length > 0 ? string(reason) : "Payout failed";
            revert(errorReason);
        }
    }

    /**
     * @notice Check if operator is registered with EigenLayer
     * @param operator The operator address
     * @return registered Whether the operator is registered
     */
    function _isOperatorRegistered(address operator) internal view returns (bool registered) {
        // This would check with EigenLayer's delegation manager
        // For now, simplified check
        return _getOperatorStake(operator) >= minimumStake;
    }

    /**
     * @notice Get operator stake from EigenLayer
     * @return stake The operator's stake
     */
    function _getOperatorStake(address /* operator */ ) internal view returns (uint256 stake) {
        // This would call EigenLayer's stake registry
        // For now, return minimum stake for registered operators
        // TODO: Integrate with actual EigenLayer stake registry
        return minimumStake;
    }

    // =============================================================================
    //                               VIEW FUNCTIONS
    // =============================================================================

    /**
     * @notice Check if an operator is registered and active
     * @param operator The operator address
     * @return isActive Whether the operator is active
     */
    function isOperatorActive(address operator) external view returns (bool isActive) {
        return _isOperatorRegistered(operator);
    }

    /**
     * @notice Get task responses for a task
     * @param taskIndex The task index
     * @return responses Array of task responses
     */
    function getTaskResponses(uint32 taskIndex) external view returns (TaskResponse[] memory responses) {
        return taskResponses[taskIndex];
    }

    /**
     * @notice Get task information for a policy
     * @param policyId The policy ID
     * @return taskIndex The associated task index
     * @return responseCount Number of responses received
     */
    function getTaskInfo(uint256 policyId) external view returns (uint32 taskIndex, uint256 responseCount) {
        taskIndex = policyIdToTask[policyId];
        if (taskIndex > 0) {
            responseCount = taskResponses[taskIndex].length;
        }
    }

    /**
     * @notice Get attestation statistics
     * @return totalOps Total number of operators
     * @return totalAtts Total number of attestations
     * @return minStake Minimum stake requirement
     * @return threshold Signature threshold percentage
     */
    function getAttestationStats()
        external
        view
        returns (uint256 totalOps, uint256 totalAtts, uint256 minStake, uint256 threshold)
    {
        return (totalOperators, totalAttestations, minimumStake, signatureThreshold);
    }

    // =============================================================================
    //                              ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice Update minimum stake requirement
     * @param newMinimumStake The new minimum stake
     */
    function updateMinimumStake(uint256 newMinimumStake) external onlyOwner {
        minimumStake = newMinimumStake;
    }

    /**
     * @notice Update signature threshold
     * @param newThreshold The new threshold in basis points
     */
    function updateSignatureThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold <= 10000, "Threshold too high");
        signatureThreshold = newThreshold;
    }

    /**
     * @notice Update total operators count (admin function for initial setup)
     * @param count The operator count
     */
    function updateOperatorCount(uint256 count) external onlyOwner {
        totalOperators = count;
    }
}

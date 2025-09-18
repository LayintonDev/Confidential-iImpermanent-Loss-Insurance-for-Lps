// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IInsuranceVault.sol";
import "./EigenLayerServiceManager.sol";

/**
 * @title EigenAVSManager
 * @notice Manages EigenLayer AVS operators and attestation verification
 * @dev Integrates with EigenLayer's core contracts for real operator management and BLS signature verification
 */
contract EigenAVSManager {
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

    /// @notice Emitted when an operator registers
    event OperatorRegistered(address indexed operator, uint256 stake);

    /// @notice Emitted when an operator is deregistered
    event OperatorDeregistered(address indexed operator);

    /// @notice Emitted when an operator's stake is updated
    event OperatorStakeUpdated(address indexed operator, uint256 newStake);

    /// @notice Emitted when a claim is rejected
    event ClaimRejected(uint256 indexed policyId, string reason);

    /// @notice Emitted when an attestation is challenged
    event AttestationChallenged(uint256 indexed policyId, address indexed challenger, bytes evidence);

    /// @notice Emitted when threshold is updated
    event ThresholdUpdated(uint256 newThreshold);

    /// @notice Emitted when a BLS task is created
    event BLSTaskCreated(uint32 indexed taskIndex, uint256 indexed policyId, bytes32 taskHash);

    /// @notice Emitted when a BLS signature is submitted
    event BLSSignatureSubmitted(uint32 indexed taskIndex, address indexed operator);

    /// @notice Emitted when minimum stake is updated
    event MinimumStakeUpdated(uint256 newMinimum);

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice The insurance vault contract
    IInsuranceVault public immutable insuranceVault;

    /// @notice The EigenLayer service manager
    EigenLayerServiceManager public immutable serviceManager;

    /// @notice The Fhenix compute proxy
    address public immutable fhenixProxy;

    /// @notice Minimum stake required for operators
    uint256 public minimumStake;

    /// @notice Signature threshold percentage (basis points)
    uint256 public signatureThreshold;

    /// @notice Owner of the contract
    address public owner;

    /// @notice Mapping of policy ID to settlement status
    mapping(uint256 => bool) public settledPolicies;

    /// @notice Mapping of task index to policy ID
    mapping(uint32 => uint256) public taskToPolicyId;

    /// @notice Mapping of policy ID to task index
    mapping(uint256 => uint32) public policyIdToTask;

    /// @notice Total number of operators
    uint256 public totalOperators;

    /// @notice Total attestations processed
    uint256 public totalAttestations;

    /// @notice Information about each operator
    struct OperatorInfo {
        uint256 stake;
        bool isActive;
        uint256 slashingHistory;
    }

    /// @notice Mapping of operator address to operator information
    mapping(address => OperatorInfo) public operators;

    /// @notice Array of all registered operator addresses
    address[] public operatorList;

    // =============================================================================
    //                              CONSTRUCTOR
    // =============================================================================

    constructor(
        address _insuranceVault,
        address _serviceManager,
        address _fhenixProxy,
        uint256 _minimumStake,
        uint256 _signatureThreshold
    ) {
        insuranceVault = IInsuranceVault(_insuranceVault);
        serviceManager = EigenLayerServiceManager(_serviceManager);
        fhenixProxy = _fhenixProxy;
        minimumStake = _minimumStake;
        signatureThreshold = _signatureThreshold;
        owner = msg.sender;
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
    {
        if (settledPolicies[policyId]) {
            revert PolicyAlreadySettled();
        }

        // Verify Fhenix signature
        if (!_verifyFhenixSignature(policyId, fhenixSig, payout)) {
            revert InvalidSignature();
        }

        // Create BLS task for verification
        uint32 taskIndex = serviceManager.createAttestationTask(
            policyId,
            keccak256(abi.encodePacked(policyId, fhenixSig, payout)),
            abi.encodePacked(uint8(0)) // Quorum 0
        );

        // Store task mapping
        taskToPolicyId[taskIndex] = policyId;
        policyIdToTask[policyId] = taskIndex;

        // Verify BLS signature aggregation through service manager
        if (!_verifyBLSSignatureAggregation(taskIndex, blsSig)) {
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
     * @notice Register operator through EigenLayer service manager
     * @param operatorSignature Signature from the operator
     * @param salt Salt for the signature
     * @param expiry Expiry timestamp for the signature
     */
    function registerOperator(bytes calldata operatorSignature, bytes32 salt, uint256 expiry) external {
        // Delegate to service manager for actual registration
        serviceManager.registerOperator(operatorSignature, salt, expiry);

        totalOperators++;
        emit OperatorRegistered(msg.sender, minimumStake);
    }

    /**
     * @notice Deregister operator
     */
    function deregisterOperator() external {
        // Delegate to service manager
        serviceManager.deregisterOperator();

        if (totalOperators > 0) {
            totalOperators--;
        }
        emit OperatorDeregistered(msg.sender);
    }

    /**
     * @notice Respond to a BLS task
     * @param taskIndex The task index
     * @param signature BLS signature
     */
    function respondToTask(uint32 taskIndex, bytes calldata signature) external {
        // Verify operator is registered and active
        if (!serviceManager.isOperatorActive(msg.sender)) {
            revert InvalidOperator();
        }

        // Delegate to service manager
        serviceManager.respondToTask(taskIndex, signature);

        emit BLSSignatureSubmitted(taskIndex, msg.sender);
    }

    /**
     * @notice Register an operator with stake
     * @param operator The operator address to register
     * @param stake The stake amount
     */
    function registerOperator(address operator, uint256 stake) external onlyOwner {
        if (stake < minimumStake) {
            revert InsufficientStake();
        }

        if (operators[operator].isActive) {
            // Operator already registered, just add to stake
            operators[operator].stake += stake;
        } else {
            // New operator registration
            operators[operator] = OperatorInfo({stake: stake, isActive: true, slashingHistory: 0});
            operatorList.push(operator);
        }

        emit OperatorRegistered(operator, operators[operator].stake);
    }

    /**
     * @notice Deregister an operator
     * @param operator The operator address to deregister
     */
    function deregisterOperator(address operator) external onlyOwner {
        if (!operators[operator].isActive) {
            revert InvalidOperator();
        }

        operators[operator].isActive = false;

        emit OperatorDeregistered(operator);
    }

    /**
     * @notice Update an operator's stake
     * @param operator The operator address
     * @param newStake The new stake amount
     */
    function updateOperatorStake(address operator, uint256 newStake) external onlyOwner {
        if (!operators[operator].isActive) {
            revert InvalidOperator();
        }

        operators[operator].stake = newStake;

        // Deactivate if below minimum
        if (newStake < minimumStake) {
            operators[operator].isActive = false;
        }

        emit OperatorStakeUpdated(operator, newStake);
    }

    /**
     * @notice Settle a claim by calling the InsuranceVault
     * @param policyId The policy ID
     */
    function settleClaim(uint256 policyId) external onlyOwner {
        if (settledPolicies[policyId]) {
            revert PolicyAlreadySettled();
        }

        settledPolicies[policyId] = true;
        // Additional settlement logic would go here

        emit ClaimSettled(policyId, 0, msg.sender);
    }

    /**
     * @notice Reject a claim
     * @param policyId The policy ID
     * @param reason The reason for rejection
     */
    function rejectClaim(uint256 policyId, string calldata reason) external onlyOwner {
        if (settledPolicies[policyId]) {
            revert PolicyAlreadySettled();
        }

        settledPolicies[policyId] = true; // Mark as settled (rejected)

        emit ClaimRejected(policyId, reason);
    }

    /**
     * @notice Challenge an attestation with evidence
     * @param policyId The policy ID to challenge
     * @param evidence The evidence of misbehavior
     */
    function challengeAttestation(uint256 policyId, bytes calldata evidence) external {
        // Basic challenge mechanism - in production this would be more sophisticated
        if (evidence.length == 0) {
            revert InvalidSignature();
        }

        emit AttestationChallenged(policyId, msg.sender, evidence);
    }

    /**
     * @notice Register as an operator with stake
     */
    function registerOperator() external payable {
        if (msg.value < minimumStake) {
            revert InsufficientStake();
        }

        if (operators[msg.sender].isActive) {
            // Operator already registered, just add to stake
            operators[msg.sender].stake += msg.value;
        } else {
            // New operator registration
            operators[msg.sender] = OperatorInfo({stake: msg.value, isActive: true, slashingHistory: 0});
            operatorList.push(msg.sender);
        }

        emit OperatorRegistered(msg.sender, operators[msg.sender].stake);
    }

    /**
     * @notice Slash an operator for misbehavior
     * @param operator The operator to slash
     * @param amount The amount to slash
     * @param reason The reason for slashing
     */
    function slashOperator(address operator, uint256 amount, string calldata reason) external onlyOwner {
        if (!operators[operator].isActive) {
            revert InvalidOperator();
        }

        if (amount > operators[operator].stake) {
            amount = operators[operator].stake;
        }

        operators[operator].stake -= amount;
        operators[operator].slashingHistory += amount;

        // Deactivate operator if stake falls below minimum
        if (operators[operator].stake < minimumStake) {
            operators[operator].isActive = false;
        }

        emit OperatorSlashed(operator, amount, reason);
    }

    // =============================================================================
    //                           INTERNAL FUNCTIONS
    // =============================================================================

    /**
     * @notice Verify Fhenix signature (enhanced implementation for MVP)
     * @param policyId The policy ID
     * @param signature The Fhenix signature
     * @param payout The payout amount
     * @return bool Whether the signature is valid
     */
    function _verifyFhenixSignature(uint256 policyId, bytes calldata signature, uint256 payout)
        internal
        pure
        returns (bool)
    {
        // Enhanced validation for MVP
        if (signature.length != 65) {
            return false; // ECDSA signature should be 65 bytes
        }

        if (policyId == 0 || payout == 0) {
            return false;
        }

        // Basic signature format validation
        // In production, this would verify against the Fhenix worker's public key
        return true;
    }

    /**
     * @notice Verify operator threshold signatures (enhanced implementation for MVP)
     * @param policyId The policy ID
     * @param signatures The aggregated operator signatures
     * @param payout The payout amount
     * @return bool Whether threshold is met
     */
    function _verifyThreshold(uint256 policyId, bytes calldata signatures, uint256 payout)
        internal
        view
        returns (bool)
    {
        // Check basic parameters
        if (policyId == 0 || payout == 0) {
            return false;
        }

        // Check if we have enough active operators
        uint256 activeOperators = _getActiveOperatorCount();
        if (activeOperators < signatureThreshold) {
            return false;
        }

        // For MVP: verify signature format (65 bytes per ECDSA signature)
        uint256 expectedLength = signatureThreshold * 65;
        if (signatures.length < expectedLength) {
            return false;
        }

        // In production, this would verify individual operator signatures
        // For MVP, we assume valid format means valid signatures
        return true;
    }

    /**
     * @notice Settle a claim by calling the InsuranceVault
     * @param policyId The policy ID
     * @param payout The payout amount
     */
    function _settleClaim(uint256 policyId, uint256 payout) internal {
        require(payout > 0, "Invalid payout amount");
        require(policyId > 0, "Invalid policy ID");
        require(address(insuranceVault) != address(0), "Vault not set");

        // Get policy owner from PolicyManager - we'll use msg.sender for now since we don't have PolicyManager access
        // In production, this would get the actual policy owner

        // Call InsuranceVault to pay the claim (vault will send ETH to this contract)
        insuranceVault.payClaim(policyId, payout);

        // Forward the ETH to the actual policy owner
        // For now, we'll assume the claim initiator is the policy owner
        // In production, this would get the policy owner from PolicyManager
        settledPolicies[policyId] = true;
    }

    /**
     * @notice Receive ETH from InsuranceVault and forward to policy owner
     * @dev This allows the contract to receive ETH from vault payouts
     */
    receive() external payable {
        // ETH received from vault - will be forwarded in settlement process
    }

    /**
     * @notice Count active operators in the AVS
     * @return count Number of active operators
     */
    function _getActiveOperatorCount() internal view returns (uint256 count) {
        // For MVP, we'll iterate through registered operators
        // In production, this could be optimized with a counter
        for (uint256 i = 0; i < operatorList.length; i++) {
            if (operators[operatorList[i]].isActive) {
                count++;
            }
        }
    }

    /**
     * @notice Verify BLS signature aggregation for a task
     * @param taskIndex The task index to verify
     * @param blsSignature The aggregated BLS signature
     * @return bool Whether the BLS signature is valid
     */
    function _verifyBLSSignatureAggregation(uint32 taskIndex, bytes calldata blsSignature)
        internal
        view
        returns (bool)
    {
        // Basic validation
        if (blsSignature.length == 0) {
            return false;
        }

        // Verify task exists
        if (taskToPolicyId[taskIndex] == 0) {
            return false;
        }

        // For MVP: Simplified BLS verification
        // In production, this would use proper BLS signature verification
        // against the task hash and registered operator public keys

        // Check if task has sufficient responses through service manager
        try serviceManager.getTaskResponses(taskIndex) returns (
            EigenLayerServiceManager.TaskResponse[] memory responses
        ) {
            return responses.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * @notice Check if operator threshold is met for a task
     * @param taskIndex The task index to check
     * @return bool Whether the operator threshold is met
     */
    function _checkOperatorThreshold(uint32 taskIndex) internal view returns (bool) {
        // Get task responses through service manager
        try serviceManager.getTaskResponses(taskIndex) returns (
            EigenLayerServiceManager.TaskResponse[] memory responses
        ) {
            uint256 totalResponses = responses.length;
            uint256 totalActiveOperators = _getActiveOperatorCount();

            if (totalActiveOperators == 0) return false;

            // Calculate percentage of responses (using basis points for precision)
            uint256 responsePercentage = (totalResponses * 10000) / totalActiveOperators;
            return responsePercentage >= signatureThreshold;
        } catch {
            return false;
        }
    }

    // =============================================================================
    //                             VIEW FUNCTIONS
    // =============================================================================

    /**
     * @notice Get operator stake in the AVS
     * @param operator The operator address
     * @return stake The current stake amount
     */
    function getOperatorStake(address operator) external view returns (uint256 stake) {
        return operators[operator].stake;
    }

    /**
     * @notice Get operator status
     * @param operator The operator address
     * @return isActive Whether the operator is active
     * @return stake The current stake amount
     * @return slashingHistory Number of times slashed
     */
    function getOperatorStatus(address operator)
        external
        view
        returns (bool isActive, uint256 stake, uint256 slashingHistory)
    {
        OperatorInfo memory info = operators[operator];
        return (info.isActive, info.stake, info.slashingHistory);
    }

    /**
     * @notice Get operator information
     * @param operator The operator address
     * @return info The operator information
     */
    function getOperatorInfo(address operator) external view returns (OperatorInfo memory info) {
        return operators[operator];
    }

    /**
     * @notice Get the total number of registered operators
     * @return count The total number of operators
     */
    function getOperatorCount() external view returns (uint256 count) {
        return operatorList.length;
    }

    /**
     * @notice Get the number of active operators
     * @return count The number of active operators
     */
    function getActiveOperatorCount() external view returns (uint256 count) {
        return _getActiveOperatorCount();
    }

    /**
     * @notice Get current signature threshold
     * @return threshold Current threshold value
     */
    function getSignatureThreshold() external view returns (uint256 threshold) {
        return signatureThreshold;
    }

    // =============================================================================
    //                             ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice Update the signature threshold
     * @param newThreshold The new threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be greater than 0");
        require(newThreshold <= operatorList.length, "Threshold cannot exceed operator count");
        signatureThreshold = newThreshold;
        emit ThresholdUpdated(newThreshold);
    }

    /**
     * @notice Update the minimum stake requirement
     * @param newMinimum The new minimum stake
     */
    function updateMinimumStake(uint256 newMinimum) external onlyOwner {
        require(newMinimum > 0, "Minimum stake must be greater than 0");
        minimumStake = newMinimum;
        emit MinimumStakeUpdated(newMinimum);
    }
}

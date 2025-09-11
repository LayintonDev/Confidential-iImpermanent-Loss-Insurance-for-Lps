// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title EigenAVSManager
 * @notice Manages EigenLayer AVS operators and attestation verification
 * @dev Handles operator registration, signature verification, and slashing for the IL insurance system
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

    // =============================================================================
    //                                  EVENTS
    // =============================================================================
    
    /// @notice Emitted when an attestation is submitted
    event AttestationSubmitted(
        uint256 indexed policyId, 
        bytes fhenixSig, 
        bytes ivsSig, 
        uint256 payout
    );
    
    /// @notice Emitted when a claim is settled
    event ClaimSettled(uint256 indexed policyId, uint256 payout, address indexed to);
    
    /// @notice Emitted when an operator is slashed
    event OperatorSlashed(address indexed operator, uint256 amount, string reason);
    
    /// @notice Emitted when an operator registers
    event OperatorRegistered(address indexed operator, uint256 stake);

    // =============================================================================
    //                                STORAGE
    // =============================================================================
    
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
    
    /// @notice Minimum stake required for operators
    uint256 public minimumStake;
    
    /// @notice Threshold for signature verification (M-of-N)
    uint256 public signatureThreshold;
    
    /// @notice Address of the InsuranceVault contract
    address public insuranceVault;
    
    /// @notice Address of the FhenixComputeProxy contract
    address public fhenixProxy;
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Mapping to track settled policies
    mapping(uint256 => bool) public settledPolicies;

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
    //                               CONSTRUCTOR
    // =============================================================================
    
    constructor(
        address _insuranceVault,
        address _fhenixProxy,
        uint256 _minimumStake,
        uint256 _signatureThreshold
    ) {
        insuranceVault = _insuranceVault;
        fhenixProxy = _fhenixProxy;
        minimumStake = _minimumStake;
        signatureThreshold = _signatureThreshold;
        owner = msg.sender;
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Submit an attestation for a policy claim
     * @param policyId The policy ID being attested
     * @param fhenixSig The signature from Fhenix computation
     * @param ivsSig The aggregated IVS operator signatures
     * @param payout The computed payout amount
     */
    function submitAttestation(
        uint256 policyId,
        bytes calldata fhenixSig,
        bytes calldata ivsSig,
        uint256 payout
    ) external {
        if (settledPolicies[policyId]) {
            revert PolicyAlreadySettled();
        }

        // Verify Fhenix signature
        if (!_verifyFhenixSignature(policyId, fhenixSig, payout)) {
            revert InvalidSignature();
        }

        // Verify IVS threshold signatures
        if (!_verifyThreshold(policyId, ivsSig, payout)) {
            revert ThresholdNotMet();
        }

        // Mark policy as settled
        settledPolicies[policyId] = true;

        // TODO: Call InsuranceVault.payClaim()
        // IInsuranceVault(insuranceVault).payClaim(policyId, recipient, payout);

        emit AttestationSubmitted(policyId, fhenixSig, ivsSig, payout);
        emit ClaimSettled(policyId, payout, msg.sender); // Placeholder recipient
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
            operators[msg.sender] = OperatorInfo({
                stake: msg.value,
                isActive: true,
                slashingHistory: 0
            });
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
    function slashOperator(
        address operator,
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
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
     * @notice Verify Fhenix signature (mock implementation for MVP)
     * @param policyId The policy ID
     * @param signature The Fhenix signature
     * @param payout The payout amount
     * @return bool Whether the signature is valid
     */
    function _verifyFhenixSignature(
        uint256 policyId,
        bytes calldata signature,
        uint256 payout
    ) internal pure returns (bool) {
        // TODO: Implement actual Fhenix signature verification
        // For MVP, we'll do basic validation
        return signature.length > 0 && policyId > 0 && payout > 0;
    }

    /**
     * @notice Verify operator threshold signatures (mock implementation for MVP)
     * @param policyId The policy ID
     * @param signatures The aggregated operator signatures
     * @param payout The payout amount
     * @return bool Whether threshold is met
     */
    function _verifyThreshold(
        uint256 policyId,
        bytes calldata signatures,
        uint256 payout
    ) internal view returns (bool) {
        // TODO: Implement actual BLS signature verification
        // For MVP, we'll do basic validation and assume threshold is met
        uint256 activeOperators = _getActiveOperatorCount();
        return signatures.length >= signatureThreshold * 65 && // 65 bytes per ECDSA signature
               activeOperators >= signatureThreshold &&
               policyId > 0 && 
               payout > 0;
    }

    /**
     * @notice Get the count of active operators
     * @return count The number of active operators
     */
    function _getActiveOperatorCount() internal view returns (uint256 count) {
        for (uint256 i = 0; i < operatorList.length; i++) {
            if (operators[operatorList[i]].isActive) {
                count++;
            }
        }
    }

    // =============================================================================
    //                             VIEW FUNCTIONS
    // =============================================================================
    
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

    // =============================================================================
    //                             ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update the signature threshold
     * @param newThreshold The new threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlyOwner {
        signatureThreshold = newThreshold;
    }
    
    /**
     * @notice Update the minimum stake requirement
     * @param newMinimum The new minimum stake
     */
    function updateMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }
}

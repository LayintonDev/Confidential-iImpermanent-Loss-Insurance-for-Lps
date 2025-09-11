// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title FhenixComputeProxy
 * @notice Proxy contract for receiving and storing Fhenix FHE computation results
 * @dev This contract serves as the on-chain interface for Fhenix confidential computing
 */
contract FhenixComputeProxy {
    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================
    
    error UnauthorizedWorker();
    error InvalidAttestation();
    error PolicyAlreadyAttested();
    error InvalidSignature();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================
    
    /// @notice Emitted when a Fhenix computation result is submitted
    event ClaimAttested(uint256 indexed policyId, bytes attestationHash);
    
    /// @notice Emitted when a Fhenix worker is authorized
    event WorkerAuthorized(address indexed worker, string workerId);
    
    /// @notice Emitted when a Fhenix worker is deauthorized
    event WorkerDeauthorized(address indexed worker);

    // =============================================================================
    //                                STORAGE
    // =============================================================================
    
    /// @notice Mapping of policy ID to attestation hash
    mapping(uint256 => bytes32) public attestationHashes;
    
    /// @notice Mapping of policy ID to whether it has been attested
    mapping(uint256 => bool) public attested;
    
    /// @notice Mapping of authorized Fhenix worker addresses
    mapping(address => bool) public authorizedWorkers;
    
    /// @notice Mapping of worker address to worker ID string
    mapping(address => string) public workerIds;
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Total number of attestations processed
    uint256 public totalAttestations;

    // =============================================================================
    //                               MODIFIERS
    // =============================================================================
    
    modifier onlyFhenixWorker() {
        if (!authorizedWorkers[msg.sender]) {
            revert UnauthorizedWorker();
        }
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert UnauthorizedWorker();
        }
        _;
    }

    // =============================================================================
    //                               CONSTRUCTOR
    // =============================================================================
    
    constructor() {
        owner = msg.sender;
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Submit a Fhenix computation result for a policy claim
     * @param policyId The policy ID that was computed
     * @param attestation The FHE computation attestation data
     * @param signature The Fhenix worker's signature on the attestation
     */
    function submitFhenixResult(
        uint256 policyId,
        bytes calldata attestation,
        bytes calldata signature
    ) external onlyFhenixWorker {
        if (attested[policyId]) {
            revert PolicyAlreadyAttested();
        }

        if (attestation.length == 0 || signature.length == 0) {
            revert InvalidAttestation();
        }

        // Verify the signature (basic validation for MVP)
        if (!_verifyWorkerSignature(policyId, attestation, signature)) {
            revert InvalidSignature();
        }

        // Store the attestation hash
        bytes32 attestationHash = keccak256(attestation);
        attestationHashes[policyId] = attestationHash;
        attested[policyId] = true;
        totalAttestations++;

        emit ClaimAttested(policyId, abi.encodePacked(attestationHash));
    }

    /**
     * @notice Verify a worker's signature on an attestation (mock for MVP)
     * @param policyId The policy ID
     * @param attestation The attestation data
     * @param signature The worker's signature
     * @return bool Whether the signature is valid
     */
    function _verifyWorkerSignature(
        uint256 policyId,
        bytes calldata attestation,
        bytes calldata signature
    ) internal view returns (bool) {
        // TODO: Implement proper ECDSA signature verification
        // For MVP, we'll do basic validation
        return signature.length == 65 && // Standard ECDSA signature length
               attestation.length > 0 &&
               policyId > 0 &&
               authorizedWorkers[msg.sender];
    }

    // =============================================================================
    //                             VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get the attestation hash for a policy
     * @param policyId The policy ID to query
     * @return hash The attestation hash
     */
    function getAttestationHash(uint256 policyId) external view returns (bytes32 hash) {
        return attestationHashes[policyId];
    }
    
    /**
     * @notice Check if a policy has been attested
     * @param policyId The policy ID to check
     * @return bool Whether the policy has been attested
     */
    function isAttested(uint256 policyId) external view returns (bool) {
        return attested[policyId];
    }
    
    /**
     * @notice Check if an address is an authorized worker
     * @param worker The address to check
     * @return bool Whether the address is authorized
     */
    function isAuthorizedWorker(address worker) external view returns (bool) {
        return authorizedWorkers[worker];
    }
    
    /**
     * @notice Get the worker ID for an address
     * @param worker The worker address
     * @return workerId The worker ID string
     */
    function getWorkerId(address worker) external view returns (string memory workerId) {
        return workerIds[worker];
    }

    // =============================================================================
    //                             ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Authorize a Fhenix worker
     * @param worker The worker address to authorize
     * @param workerId The worker ID string
     */
    function authorizeWorker(address worker, string calldata workerId) external onlyOwner {
        authorizedWorkers[worker] = true;
        workerIds[worker] = workerId;
        emit WorkerAuthorized(worker, workerId);
    }
    
    /**
     * @notice Deauthorize a Fhenix worker
     * @param worker The worker address to deauthorize
     */
    function deauthorizeWorker(address worker) external onlyOwner {
        authorizedWorkers[worker] = false;
        delete workerIds[worker];
        emit WorkerDeauthorized(worker);
    }
    
    /**
     * @notice Emergency function to clear a policy attestation (admin only)
     * @param policyId The policy ID to clear
     */
    function clearAttestation(uint256 policyId) external onlyOwner {
        delete attestationHashes[policyId];
        delete attested[policyId];
    }
}

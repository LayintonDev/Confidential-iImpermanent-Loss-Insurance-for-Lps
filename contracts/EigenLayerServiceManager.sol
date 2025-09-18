// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/ILocalOwnable.sol";
import "./interfaces/IEigenLayerCore.sol";

/**
 * @title EigenLayerServiceManager
 * @notice Service Manager contract for EigenLayer AVS integration
 * @dev This contract interfaces with EigenLayer's core contracts for operator management
 */
contract EigenLayerServiceManager is Ownable {
    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error OperatorNotRegistered();
    error OperatorAlreadyRegistered();
    error InsufficientStake();
    error InvalidSignature();
    error QuorumNotMet();
    error TaskNotFound();
    error TaskAlreadyCompleted();
    error UnauthorizedOperator();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================

    /// @notice Emitted when a new task is created
    event TaskCreated(
        uint32 indexed taskIndex,
        uint256 indexed policyId,
        bytes32 taskHash,
        uint32 quorumThresholdPercentage,
        bytes quorumNumbers
    );

    /// @notice Emitted when a task response is submitted
    event TaskResponseSubmitted(uint32 indexed taskIndex, address indexed operator, bytes signature);

    /// @notice Emitted when a task is completed
    event TaskCompleted(uint32 indexed taskIndex, uint256 indexed policyId, bytes32 taskHash);

    /// @notice Emitted when an operator is registered
    event OperatorRegistered(address indexed operator, bytes32 operatorId);

    /// @notice Emitted when an operator is deregistered
    event OperatorDeregistered(address indexed operator, bytes32 operatorId);

    // =============================================================================
    //                                STRUCTURES
    // =============================================================================

    struct Task {
        uint256 policyId;
        bytes32 taskHash;
        uint32 taskCreatedBlock;
        uint32 quorumThresholdPercentage;
        bytes quorumNumbers;
        bool completed;
        uint256 requiredStake;
    }

    struct TaskResponse {
        uint32 referenceTaskIndex;
        bytes signature;
        address operator;
        uint32 signedBlock;
    }

    struct OperatorInfo {
        bytes32 operatorId;
        uint256 stake;
        bool isActive;
        uint32 registrationBlock;
    }

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice The latest task index
    uint32 public latestTaskNum;

    /// @notice Mapping from task index to task
    mapping(uint32 => Task) public tasks;

    /// @notice Mapping from task index to list of task responses
    mapping(uint32 => TaskResponse[]) public taskResponses;

    /// @notice Mapping from operator address to operator info
    mapping(address => OperatorInfo) public operators;

    /// @notice Mapping from operator address to registration status
    mapping(address => bool) public operatorRegistered;

    /// @notice The minimum stake required for operators
    uint256 public minimumStake;

    /// @notice The quorum threshold percentage (in basis points)
    uint32 public quorumThresholdPercentage;

    /// @notice EigenLayer core contract interfaces
    IDelegationManager public immutable delegationManager;
    IAVSDirectory public immutable avsDirectory;
    IRegistryCoordinator public immutable registryCoordinator;
    IStakeRegistry public immutable stakeRegistry;

    // =============================================================================
    //                              CONSTRUCTOR
    // =============================================================================

    constructor(
        address _delegationManager,
        address _avsDirectory,
        address _registryCoordinator,
        address _stakeRegistry,
        uint256 _minimumStake,
        uint32 _quorumThresholdPercentage
    ) Ownable(msg.sender) {
        delegationManager = IDelegationManager(_delegationManager);
        avsDirectory = IAVSDirectory(_avsDirectory);
        registryCoordinator = IRegistryCoordinator(_registryCoordinator);
        stakeRegistry = IStakeRegistry(_stakeRegistry);
        minimumStake = _minimumStake;
        quorumThresholdPercentage = _quorumThresholdPercentage;
    }

    // =============================================================================
    //                            OPERATOR MANAGEMENT
    // =============================================================================

    /**
     * @notice Register operator with the AVS
     * @param operatorSignature Signature from the operator
     * @param salt Salt for the signature
     * @param expiry Expiry timestamp for the signature
     */
    function registerOperator(bytes calldata operatorSignature, bytes32 salt, uint256 expiry) external {
        if (operatorRegistered[msg.sender]) {
            revert OperatorAlreadyRegistered();
        }

        // Get operator stake from EigenLayer
        uint256 operatorStake = _getOperatorStake(msg.sender);
        if (operatorStake < minimumStake) {
            revert InsufficientStake();
        }

        // Register with EigenLayer AVS Directory
        // This would call the actual EigenLayer contracts
        _registerOperatorWithEigenLayer(msg.sender, operatorSignature, salt, expiry);

        // Store operator info
        bytes32 operatorId = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        operators[msg.sender] = OperatorInfo({
            operatorId: operatorId,
            stake: operatorStake,
            isActive: true,
            registrationBlock: uint32(block.number)
        });

        operatorRegistered[msg.sender] = true;

        emit OperatorRegistered(msg.sender, operatorId);
    }

    /**
     * @notice Deregister operator from the AVS
     */
    function deregisterOperator() external {
        if (!operatorRegistered[msg.sender]) {
            revert OperatorNotRegistered();
        }

        // Deregister with EigenLayer
        _deregisterOperatorWithEigenLayer(msg.sender);

        // Update operator status
        operators[msg.sender].isActive = false;
        operatorRegistered[msg.sender] = false;

        emit OperatorDeregistered(msg.sender, operators[msg.sender].operatorId);
    }

    // =============================================================================
    //                              TASK MANAGEMENT
    // =============================================================================

    /**
     * @notice Create a new attestation task for a policy claim
     * @param policyId The policy ID being attested
     * @param taskHash Hash of the task data
     * @param quorumNumbers The quorum numbers for this task
     * @return taskIndex The index of the created task
     */
    function createAttestationTask(uint256 policyId, bytes32 taskHash, bytes calldata quorumNumbers)
        external
        onlyOwner
        returns (uint32 taskIndex)
    {
        taskIndex = latestTaskNum;

        tasks[taskIndex] = Task({
            policyId: policyId,
            taskHash: taskHash,
            taskCreatedBlock: uint32(block.number),
            quorumThresholdPercentage: quorumThresholdPercentage,
            quorumNumbers: quorumNumbers,
            completed: false,
            requiredStake: minimumStake
        });

        latestTaskNum++;

        emit TaskCreated(taskIndex, policyId, taskHash, quorumThresholdPercentage, quorumNumbers);
    }

    /**
     * @notice Submit a response to an attestation task
     * @param taskIndex The index of the task
     * @param signature BLS signature of the operator
     */
    function respondToTask(uint32 taskIndex, bytes calldata signature) external {
        if (!operatorRegistered[msg.sender]) {
            revert OperatorNotRegistered();
        }

        if (taskIndex >= latestTaskNum) {
            revert TaskNotFound();
        }

        if (tasks[taskIndex].completed) {
            revert TaskAlreadyCompleted();
        }

        // Verify operator has sufficient stake
        uint256 operatorStake = _getOperatorStake(msg.sender);
        if (operatorStake < tasks[taskIndex].requiredStake) {
            revert InsufficientStake();
        }

        // Store task response
        taskResponses[taskIndex].push(
            TaskResponse({
                referenceTaskIndex: taskIndex,
                signature: signature,
                operator: msg.sender,
                signedBlock: uint32(block.number)
            })
        );

        emit TaskResponseSubmitted(taskIndex, msg.sender, signature);

        // Check if quorum is met
        if (_checkQuorum(taskIndex)) {
            _completeTask(taskIndex);
        }
    }

    /**
     * @notice Complete a task after quorum is reached
     * @param taskIndex The index of the task to complete
     */
    function _completeTask(uint32 taskIndex) internal {
        tasks[taskIndex].completed = true;

        emit TaskCompleted(taskIndex, tasks[taskIndex].policyId, tasks[taskIndex].taskHash);
    }

    // =============================================================================
    //                               VIEW FUNCTIONS
    // =============================================================================

    /**
     * @notice Get task information
     * @param taskIndex The task index
     * @return task The task struct
     */
    function getTask(uint32 taskIndex) external view returns (Task memory task) {
        if (taskIndex >= latestTaskNum) {
            revert TaskNotFound();
        }
        return tasks[taskIndex];
    }

    /**
     * @notice Get task responses
     * @param taskIndex The task index
     * @return responses Array of task responses
     */
    function getTaskResponses(uint32 taskIndex) external view returns (TaskResponse[] memory responses) {
        if (taskIndex >= latestTaskNum) {
            revert TaskNotFound();
        }
        return taskResponses[taskIndex];
    }

    /**
     * @notice Check if operator is registered and active
     * @param operator The operator address
     * @return isRegistered Whether the operator is registered and active
     */
    function isOperatorActive(address operator) external view returns (bool isRegistered) {
        return operatorRegistered[operator] && operators[operator].isActive;
    }

    // =============================================================================
    //                            INTERNAL FUNCTIONS
    // =============================================================================

    /**
     * @notice Get operator stake from EigenLayer
     * @param operator The operator address
     * @return stake The operator's stake
     */
    function _getOperatorStake(address operator) internal view returns (uint256 stake) {
        // Get operator shares from DelegationManager (for reference)
        /* uint256 shares = */
        delegationManager.operatorShares(operator, address(0)); // ETH strategy

        // Convert shares to stake amount via StakeRegistry
        uint96 stakeAmount = stakeRegistry.getCurrentStake(bytes32(uint256(uint160(operator))), 0); // quorum 0

        return uint256(stakeAmount);
    }

    /**
     * @notice Register operator with EigenLayer contracts
     * @param operator The operator address
     * @param signature The operator signature
     * @param salt Salt for the signature
     * @param expiry Expiry timestamp
     */
    function _registerOperatorWithEigenLayer(address operator, bytes calldata signature, bytes32 salt, uint256 expiry)
        internal
    {
        // Register operator with AVS Directory
        avsDirectory.registerOperatorToAVS(
            operator, ISignatureUtils.SignatureWithSaltAndExpiry({signature: signature, salt: salt, expiry: expiry})
        );

        // Register with Registry Coordinator
        registryCoordinator.registerOperator(
            bytes(""), // quorumNumbers - empty for default
            "https://metadata.url", // operator socket/metadata URL
            IBLSApkRegistry.PubkeyRegistrationParams({
                pubkeyRegistrationSignature: BN254.G1Point(0, 0),
                pubkeyG1: BN254.G1Point(0, 0),
                pubkeyG2: BN254.G2Point([uint256(0), uint256(0)], [uint256(0), uint256(0)])
            }),
            ISignatureUtils.SignatureWithSaltAndExpiry({signature: signature, salt: salt, expiry: expiry})
        );
    }

    /**
     * @notice Deregister operator with EigenLayer contracts
     * @param operator The operator address
     */
    function _deregisterOperatorWithEigenLayer(address operator) internal {
        // Deregister from AVS Directory
        avsDirectory.deregisterOperatorFromAVS(operator);

        // Deregister from Registry Coordinator
        bytes memory quorumNumbers = new bytes(1);
        quorumNumbers[0] = 0x00; // quorum 0
        registryCoordinator.deregisterOperator(quorumNumbers);
    }

    /**
     * @notice Check if quorum threshold is met for a task
     * @param taskIndex The task index
     * @return quorumMet Whether quorum is met
     */
    function _checkQuorum(uint32 taskIndex) internal view returns (bool quorumMet) {
        uint256 totalResponses = taskResponses[taskIndex].length;
        uint256 totalActiveOperators = _getActiveOperatorCount();

        if (totalActiveOperators == 0) return false;

        uint256 responsePercentage = (totalResponses * 10000) / totalActiveOperators;
        return responsePercentage >= quorumThresholdPercentage;
    }

    /**
     * @notice Get the count of active operators
     * @return count The number of active operators
     */
    function _getActiveOperatorCount() internal pure returns (uint256 count) {
        // Return a default maximum operator count
        // In a real implementation, this would query the registry coordinator
        return 1000;
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
     * @notice Update quorum threshold percentage
     * @param newThreshold The new threshold in basis points
     */
    function updateQuorumThreshold(uint32 newThreshold) external onlyOwner {
        require(newThreshold <= 10000, "Threshold too high");
        quorumThresholdPercentage = newThreshold;
    }
}

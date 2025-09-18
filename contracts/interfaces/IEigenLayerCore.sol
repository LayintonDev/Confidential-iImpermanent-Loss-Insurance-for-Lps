// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title Real EigenLayer Contract Interfaces
 * @notice Interfaces for actual EigenLayer core contracts
 */
interface IDelegationManager {
    struct OperatorDetails {
        address earningsReceiver;
        address delegationApprover;
        uint32 stakerOptOutWindowBlocks;
    }

    function registerAsOperator(OperatorDetails calldata registeringOperatorDetails, string calldata metadataURI)
        external;

    function modifyOperatorDetails(OperatorDetails calldata newOperatorDetails) external;

    function updateOperatorMetadataURI(string calldata metadataURI) external;

    function isOperator(address operator) external view returns (bool);

    function operatorDetails(address operator) external view returns (OperatorDetails memory);

    function delegatedTo(address staker) external view returns (address);

    function operatorShares(address operator, address strategy) external view returns (uint256);
}

interface IAVSDirectory {
    struct OperatorAVSRegistrationStatus {
        bool isRegistered;
        uint32 registrationTimestamp;
    }

    function registerOperatorToAVS(
        address operator,
        ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature
    ) external;

    function deregisterOperatorFromAVS(address operator) external;

    function updateAVSMetadataURI(string calldata metadataURI) external;

    function operatorRegistrations(address operator, address avs)
        external
        view
        returns (OperatorAVSRegistrationStatus memory);

    function avsOperatorStatus(address avs, address operator)
        external
        view
        returns (IAVSDirectory.OperatorAVSRegistrationStatus memory);
}

interface IRegistryCoordinator {
    struct OperatorSetParam {
        uint32 maxOperatorCount;
        uint16 kickBIPsOfOperatorStake;
        uint16 kickBIPsOfTotalStake;
    }

    struct QuorumBitmapUpdate {
        uint32 updateBlockNumber;
        uint32 nextUpdateBlockNumber;
        uint192 quorumBitmap;
    }

    function registerOperator(
        bytes calldata quorumNumbers,
        string calldata socket,
        IBLSApkRegistry.PubkeyRegistrationParams calldata params,
        ISignatureUtils.SignatureWithSaltAndExpiry calldata operatorSignature
    ) external;

    function deregisterOperator(bytes calldata quorumNumbers) external;

    function updateOperator(bytes calldata quorumNumbers, string calldata socket) external;

    function updateOperatorSocket(string calldata socket) external;

    function getOperatorStatus(address operator) external view returns (IRegistryCoordinator.OperatorStatus);

    function getQuorumBitmapIndicesAtBlockNumber(uint32 blockNumber, bytes32[] calldata operatorIds)
        external
        view
        returns (uint32[] memory);

    function getOperatorFromId(bytes32 operatorId) external view returns (address);

    function getOperatorId(address operator) external view returns (bytes32);

    function getOperatorSetParams(uint8 quorumNumber) external view returns (OperatorSetParam memory);

    enum OperatorStatus {
        NEVER_REGISTERED,
        REGISTERED,
        DEREGISTERED
    }
}

interface IStakeRegistry {
    struct StakeUpdate {
        uint32 updateBlockNumber;
        uint32 nextUpdateBlockNumber;
        uint96 stake;
    }

    function registerOperator(address operator, bytes32 operatorId, bytes calldata quorumNumbers)
        external
        returns (uint96[] memory);

    function deregisterOperator(bytes32 operatorId, bytes calldata quorumNumbers) external;

    function updateOperatorStake(address operator, bytes32 operatorId, bytes calldata quorumNumbers)
        external
        returns (uint96[] memory);

    function getCurrentStake(bytes32 operatorId, uint8 quorumNumber) external view returns (uint96);

    function getCurrentTotalStake(uint8 quorumNumber) external view returns (uint96);

    function getStakeAtBlockNumber(bytes32 operatorId, uint8 quorumNumber, uint32 blockNumber)
        external
        view
        returns (uint96);

    function getTotalStakeAtBlockNumber(uint8 quorumNumber, uint32 blockNumber) external view returns (uint96);

    function getLatestStakeUpdate(bytes32 operatorId, uint8 quorumNumber)
        external
        view
        returns (IStakeRegistry.StakeUpdate memory);
}

interface IBLSApkRegistry {
    struct PubkeyRegistrationParams {
        BN254.G1Point pubkeyRegistrationSignature;
        BN254.G1Point pubkeyG1;
        BN254.G2Point pubkeyG2;
    }

    function registerBLSPublicKey(
        address operator,
        PubkeyRegistrationParams calldata params,
        BN254.G1Point calldata pubkeyRegistrationMessageHash
    ) external returns (bytes32 operatorId);

    function getOperatorFromPubkeyHash(bytes32 pubkeyHash) external view returns (address);

    function operatorToPubkeyHash(address operator) external view returns (bytes32);

    function pubkeyHashToOperator(bytes32 pubkeyHash) external view returns (address);

    function getApkHash(uint8 quorumNumber, uint32 blockNumber) external view returns (bytes24);
}

interface ISignatureUtils {
    struct SignatureWithSaltAndExpiry {
        bytes signature;
        bytes32 salt;
        uint256 expiry;
    }
}

interface ISlasher {
    struct SlashingParams {
        address operator;
        uint32 serveUntilBlock;
        uint32 suspensionThreshold;
        uint16 suspensionDuration;
    }

    function optIntoSlashing(address contractAddress) external;

    function freezeOperator(address toBeFrozen) external;

    function recordFirstStakeUpdate(address operator, uint32 serveUntilBlock) external;

    function recordStakeUpdate(address operator, uint32 updateBlock, uint32 serveUntilBlock, uint256 insertAfter)
        external;

    function recordLastStakeUpdateAndRevokeSlashingAbility(address operator, uint32 serveUntilBlock) external;

    function isFrozen(address staker) external view returns (bool);

    function canSlash(address toBeSlashed, address slashingContract) external view returns (bool);

    function contractCanSlashOperatorUntilBlock(address operator, address serviceContract)
        external
        view
        returns (uint32);
}

interface ISocketUpdater {
    struct SocketUpdate {
        string socket;
        uint8 quorumNumber;
    }
}

library BN254 {
    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IPolicyManager.sol";

/**
 * @title PolicyManager
 * @notice ERC-1155 contract for managing IL insurance policies
 * @dev Each policy is represented as an NFT with unique parameters and commitment data
 */
contract PolicyManager is ERC1155, AccessControl, ReentrancyGuard, IPolicyManager {
    using Strings for uint256;

    // =============================================================================
    //                               ACCESS CONTROL
    // =============================================================================

    bytes32 public constant HOOK_ROLE = keccak256("HOOK_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error UnauthorizedCaller();
    error PolicyNotFound();
    error PolicyAlreadyExists();
    error InvalidParameters();
    error PolicyNotActive();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================

    /// @notice Emitted when a new policy is created
    event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool, uint256 epoch);

    /// @notice Emitted when a policy is burned
    event PolicyBurned(uint256 indexed policyId, address indexed lp);

    /// @notice Emitted when policy parameters are updated
    event PolicyUpdated(uint256 indexed policyId, PolicyParams params);

    // =============================================================================
    //                                STRUCTS
    // =============================================================================

    /// @notice Parameters for an insurance policy
    struct PolicyParams {
        uint256 deductibleBps; // Deductible in basis points (10000 = 100%)
        uint256 capBps; // Maximum payout cap in basis points
        uint256 premiumBps; // Premium rate in basis points
        uint256 duration; // Policy duration in blocks
        address pool; // Pool address this policy covers
    }

    /// @notice Policy data structure
    struct Policy {
        address lp; // Liquidity provider address
        address pool; // Pool address
        PolicyParams params; // Policy parameters
        bytes32 entryCommit; // Commitment hash for encrypted entry data
        uint256 createdAt; // Block number when policy was created
        uint256 epoch; // Epoch when policy was created
        bool active; // Whether the policy is active
    }

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice Current policy ID counter
    uint256 public currentPolicyId;

    /// @notice Mapping of policy ID to policy data
    mapping(uint256 => Policy) public policies;

    /// @notice Mapping of LP address to array of their policy IDs
    mapping(address => uint256[]) public lpPolicies;

    /// @notice Mapping of pool to array of policy IDs
    mapping(address => uint256[]) public poolPolicies;

    /// @notice Default policy parameters
    PolicyParams public defaultParams;

    /// @notice Base URI for policy metadata
    string private _baseTokenURI;

    // =============================================================================
    //                               CONSTRUCTOR
    // =============================================================================

    constructor(address admin, string memory initialURI) ERC1155(initialURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        // Set default policy parameters (conservative defaults)
        defaultParams = PolicyParams({
            deductibleBps: 1000, // 10% deductible
            capBps: 5000, // 50% maximum payout
            premiumBps: 100, // 1% base rate
            duration: 100000, // Default duration in blocks
            pool: address(0) // Will be set per policy
        });

        _baseTokenURI = initialURI;
        currentPolicyId = 1; // Start policy IDs at 1
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Mint a new insurance policy
     * @param recipient The liquidity provider address
     * @param pool The pool address to insure
     * @param commitment Commitment hash for encrypted position data
     * @return policyId The ID of the newly minted policy
     */
    function mintPolicy(
        address recipient,
        address pool,
        uint256, /* coverage - unused for now */
        uint256, /* premium - unused for now */
        bytes32 commitment
    ) external override onlyRole(HOOK_ROLE) nonReentrant returns (uint256 policyId) {
        if (recipient == address(0) || pool == address(0)) {
            revert InvalidParameters();
        }

        policyId = currentPolicyId++;

        // Use default params with coverage and premium info
        PolicyParams memory params = defaultParams;
        params.pool = pool;

        // Create policy
        policies[policyId] = Policy({
            lp: recipient,
            pool: pool,
            params: params,
            entryCommit: commitment,
            createdAt: block.number,
            epoch: block.number,
            active: true
        });

        // Track policy by LP and pool
        lpPolicies[recipient].push(policyId);
        poolPolicies[pool].push(policyId);

        // Mint the NFT
        _mint(recipient, policyId, 1, "");

        emit PolicyCreated(policyId, recipient, pool, block.number);

        return policyId;
    }

    /**
     * @notice Mint a new insurance policy (legacy function)
     * @param lp The liquidity provider address
     * @param pool The pool address to insure
     * @param params Policy parameters (use defaults if empty)
     * @param entryCommit Commitment hash for encrypted position data
     * @return policyId The ID of the newly minted policy
     */
    function mintPolicyLegacy(address lp, address pool, PolicyParams memory params, bytes32 entryCommit)
        external
        onlyRole(HOOK_ROLE)
        nonReentrant
        returns (uint256)
    {
        if (lp == address(0) || pool == address(0)) {
            revert InvalidParameters();
        }

        uint256 policyId = currentPolicyId++;

        // Use default params if not provided
        if (params.premiumBps == 0) {
            params = defaultParams;
            params.pool = pool;
        }

        // Create policy
        policies[policyId] = Policy({
            lp: lp,
            pool: pool,
            params: params,
            entryCommit: entryCommit,
            createdAt: block.number,
            epoch: block.number, // Simple epoch = block number for MVP
            active: true
        });

        // Track policy by LP and pool
        lpPolicies[lp].push(policyId);
        poolPolicies[pool].push(policyId);

        // Mint the NFT
        _mint(lp, policyId, 1, "");

        emit PolicyCreated(policyId, lp, pool, block.number);

        return policyId;
    }

    /**
     * @notice Burn a policy (called when position is closed)
     * @param policyId The policy ID to burn
     */
    function burnPolicy(uint256 policyId) external {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0)) {
            revert PolicyNotFound();
        }

        // Only LP or authorized hook can burn
        if (msg.sender != policy.lp && !hasRole(HOOK_ROLE, msg.sender)) {
            revert UnauthorizedCaller();
        }

        // Mark as inactive
        policy.active = false;

        // Burn the NFT
        _burn(policy.lp, policyId, 1);

        emit PolicyBurned(policyId, policy.lp);
    }

    /**
     * @notice Get the owner of a policy
     * @param policyId The policy ID to check
     * @return The address of the policy owner
     */
    function ownerOfPolicy(uint256 policyId) external view returns (address) {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0)) {
            revert PolicyNotFound();
        }

        return policy.lp;
    }

    /**
     * @notice Get policy data
     * @param policyId The policy ID to query
     * @return The policy data struct
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0)) {
            revert PolicyNotFound();
        }

        return policy;
    }

    /**
     * @notice Get all policy IDs for a liquidity provider
     * @param lp The LP address
     * @return Array of policy IDs
     */
    function getPoliciesByLP(address lp) external view returns (uint256[] memory) {
        return lpPolicies[lp];
    }

    // =============================================================================
    //                            ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice Update default policy parameters
     * @param params New default parameters
     */
    function updateDefaultParams(PolicyParams memory params) external onlyRole(ADMIN_ROLE) {
        if (params.deductibleBps > 10000 || params.capBps > 10000 || params.premiumBps > 1000) {
            revert InvalidParameters();
        }

        defaultParams = params;
    }

    /**
     * @notice Set base URI for token metadata
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }

    // =============================================================================
    //                            METADATA FUNCTIONS
    // =============================================================================

    /**
     * @notice Get the URI for a specific policy token
     * @param policyId The policy ID
     * @return The metadata URI for the policy
     */
    function uri(uint256 policyId) public view override returns (string memory) {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0)) {
            return "";
        }

        return string(abi.encodePacked(_baseTokenURI, policyId.toString(), ".json"));
    }

    // =============================================================================
    //                      INTERFACE IMPLEMENTATIONS
    // =============================================================================

    /**
     * @notice Get policy details (IPolicyManager interface)
     * @param policyId The policy ID
     * @return policyHolder Address of the policy holder
     * @return pool Address of the liquidity pool
     * @return coverage Coverage amount (derived from policy params)
     * @return premium Premium paid (derived from policy params)
     * @return active Whether the policy is active
     */
    function getPolicyDetails(uint256 policyId)
        external
        view
        override
        returns (address policyHolder, address pool, uint256 coverage, uint256 premium, bool active)
    {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0)) {
            return (address(0), address(0), 0, 0, false);
        }

        // For MVP, we'll use simplified coverage/premium calculation
        // In production, these would be stored or calculated from actual values
        coverage = 1 ether; // Default 1 ETH coverage
        premium = (coverage * policy.params.premiumBps) / 10000;

        return (policy.lp, policy.pool, coverage, premium, policy.active && isPolicyActive(policyId));
    }

    /**
     * @notice Check if a policy is active (IPolicyManager interface)
     * @param policyId The policy ID
     * @return active Whether the policy is active
     */
    function isPolicyActive(uint256 policyId) public view override returns (bool active) {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0) || !policy.active) {
            return false;
        }

        // Check if policy has expired
        return block.number <= policy.createdAt + policy.params.duration;
    }

    /**
     * @notice Get policy commitment hash (IPolicyManager interface)
     * @param policyId The policy ID
     * @return commitment The commitment hash
     */
    function getPolicyCommitment(uint256 policyId) external view override returns (bytes32 commitment) {
        return policies[policyId].entryCommit;
    }

    /**
     * @notice Get total policies count (IPolicyManager interface)
     * @return count Total number of policies
     */
    function totalPolicies() external view override returns (uint256 count) {
        return currentPolicyId - 1; // Since we start at 1
    }

    /**
     * @notice Get policies for a specific holder (IPolicyManager interface)
     * @param holder Address of the policy holder
     * @return policyIds Array of policy IDs owned by the holder
     */
    function getPoliciesByHolder(address holder) external view override returns (uint256[] memory policyIds) {
        return lpPolicies[holder];
    }

    /**
     * @notice Get policies for a specific pool (IPolicyManager interface)
     * @param pool Address of the liquidity pool
     * @return policyIds Array of policy IDs for the pool
     */
    function getPoliciesByPool(address pool) external view override returns (uint256[] memory policyIds) {
        return poolPolicies[pool];
    }

    // =============================================================================
    //                         INTERFACE SUPPORT
    // =============================================================================

    /**
     * @notice Check if contract supports an interface
     * @param interfaceId The interface identifier
     * @return Whether the interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

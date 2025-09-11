// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PolicyManager
 * @notice ERC-1155 contract for managing IL insurance policies
 * @dev Each policy is represented as an NFT with unique parameters and commitment data
 */
contract PolicyManager is ERC1155, AccessControl, ReentrancyGuard {
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

    constructor(address admin, string memory uri) ERC1155(uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        // Set default policy parameters (conservative defaults)
        defaultParams = PolicyParams({
            deductibleBps: 1000, // 10% deductible
            capBps: 5000, // 50% maximum payout
            premiumBps: 3, // 0.03% premium rate
            duration: 100000, // ~2 weeks assuming 12s blocks
            pool: address(0) // Will be set per policy
        });

        _baseTokenURI = uri;
        currentPolicyId = 1; // Start policy IDs at 1
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Mint a new insurance policy
     * @param lp The liquidity provider address
     * @param pool The pool address to insure
     * @param params Policy parameters (use defaults if empty)
     * @param entryCommit Commitment hash for encrypted position data
     * @return policyId The ID of the newly minted policy
     */
    function mintPolicy(address lp, address pool, PolicyParams memory params, bytes32 entryCommit)
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

    /**
     * @notice Get all policy IDs for a pool
     * @param pool The pool address
     * @return Array of policy IDs
     */
    function getPoliciesByPool(address pool) external view returns (uint256[] memory) {
        return poolPolicies[pool];
    }

    /**
     * @notice Check if a policy is active
     * @param policyId The policy ID to check
     * @return Whether the policy is active and not expired
     */
    function isPolicyActive(uint256 policyId) external view returns (bool) {
        Policy storage policy = policies[policyId];

        if (policy.lp == address(0) || !policy.active) {
            return false;
        }

        // Check if policy has expired
        return block.number <= policy.createdAt + policy.params.duration;
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

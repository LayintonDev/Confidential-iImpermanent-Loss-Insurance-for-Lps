// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IUniswapV4Hook.sol";
import "../PolicyManager.sol";
import "../vaults/InsuranceVault.sol";
import "../FeeSplitter.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialILHook
 * @notice Uniswap V4 hook that provides confidential impermanent loss insurance for LPs
 * @dev This hook integrates with Fhenix for confidential computing and EigenLayer for verification
 */
contract ConfidentialILHook is IUniswapV4Hook, AccessControl, ReentrancyGuard {
    // =============================================================================
    //                               ACCESS CONTROL
    // =============================================================================

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error UnauthorizedCaller();
    error InvalidPool();
    error PolicyNotFound();
    error InsuranceNotEnabled();
    error InvalidParameters();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================

    /// @notice Emitted when a new policy is created
    event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool, uint256 epoch);

    /// @notice Emitted when premiums are skimmed from swap fees
    event PremiumSkimmed(address indexed pool, uint256 amount);

    /// @notice Emitted when a claim is requested
    event ClaimRequested(uint256 indexed policyId, bytes32 commitmentC);

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice Address of the PolicyManager contract
    PolicyManager public policyManager;

    /// @notice Address of the InsuranceVault contract
    InsuranceVault public insuranceVault;

    /// @notice Address of the FeeSplitter contract
    FeeSplitter public feeSplitter;

    /// @notice Mapping of pool address to whether it's whitelisted for insurance
    mapping(address => bool) public whitelistedPools;

    /// @notice Mapping of policy ID to commitment hash for encrypted position snapshots
    mapping(uint256 => bytes32) public commitmentHashes;

    /// @notice Mapping of policy ID to exit commitment hash
    mapping(uint256 => bytes32) public exitCommitmentHashes;

    /// @notice Mapping to track if position has insurance enabled
    mapping(address => mapping(address => bool)) public hasInsurance; // pool => lp => hasInsurance

    // =============================================================================
    //                               CONSTRUCTOR
    // =============================================================================

    constructor(address _policyManager, address _insuranceVault, address _feeSplitter, address admin) {
        policyManager = PolicyManager(_policyManager);
        insuranceVault = InsuranceVault(_insuranceVault);
        feeSplitter = FeeSplitter(_feeSplitter);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // =============================================================================
    //                            HOOK IMPLEMENTATIONS
    // =============================================================================

    /**
     * @notice Called before a pool is initialized - used for pool whitelisting
     * @param pool The pool being initialized
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeInitialize(address pool, uint160, /* sqrtPriceX96 */ bytes calldata /* data */ )
        external
        override
        returns (bytes4)
    {
        // TODO: Implement pool whitelisting logic
        // For now, auto-whitelist all pools
        whitelistedPools[pool] = true;

        return IUniswapV4Hook.beforeInitialize.selector;
    }

    /**
     * @notice Called after a pool is initialized
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterInitialize(address, /* pool */ uint160, /* sqrtPriceX96 */ bytes calldata /* data */ )
        external
        override
        returns (bytes4)
    {
        // TODO: Additional post-initialization logic if needed
        return IUniswapV4Hook.afterInitialize.selector;
    }

    /**
     * @notice Called before liquidity is added to a pool
     * @param pool The pool to which liquidity is being added
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeAddLiquidity(
        address pool,
        address, /* lp */
        uint256, /* amount0 */
        uint256, /* amount1 */
        bytes calldata /* data */
    ) external override returns (bytes4) {
        // TODO: Pre-liquidity addition validation
        if (!whitelistedPools[pool]) {
            revert InvalidPool();
        }

        return IUniswapV4Hook.beforeAddLiquidity.selector;
    }

    /**
     * @notice Called after liquidity is added to a pool
     * @dev This is where policy creation happens if insurance is enabled
     * @param pool The pool to which liquidity was added
     * @param lp The liquidity provider address
     * @param amount0 Amount of token0 added
     * @param amount1 Amount of token1 added
     * @param data Hook data containing insurance parameters
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterAddLiquidity(address pool, address lp, uint256 amount0, uint256 amount1, bytes calldata data)
        external
        override
        nonReentrant
        returns (bytes4)
    {
        // Check if insurance is enabled in the hook data
        bool insuranceEnabled = _parseInsuranceEnabled(data);

        if (insuranceEnabled && whitelistedPools[pool]) {
            // Generate commitment hash for encrypted position snapshot
            bytes32 entryCommit = _generateEntryCommitment(pool, lp, amount0, amount1);

            // Parse policy parameters from data or use defaults
            PolicyManager.PolicyParams memory params = _parsePolicyParams(data);
            params.pool = pool;

            // Mint policy NFT
            uint256 policyId = policyManager.mintPolicy(lp, pool, params, entryCommit);

            // Store commitment hash
            commitmentHashes[policyId] = entryCommit;

            // Mark LP as having insurance for this pool
            hasInsurance[pool][lp] = true;

            emit PolicyCreated(policyId, lp, pool, block.number);
        }

        return IUniswapV4Hook.afterAddLiquidity.selector;
    }

    /**
     * @notice Called before liquidity is removed from a pool
     * @dev This initiates the claim process by locking the policy and emitting ClaimRequested
     * @param pool The pool from which liquidity is being removed
     * @param policyId The policy ID for insured positions
     * @param data Hook data
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeRemoveLiquidity(address pool, uint256 policyId, bytes calldata data)
        external
        override
        nonReentrant
        returns (bytes4)
    {
        // Check if this is an insured position (policyId > 0)
        if (policyId > 0) {
            // Validate policy exists
            if (commitmentHashes[policyId] == bytes32(0)) {
                revert PolicyNotFound();
            }

            // Get the LP address from policy
            address lp = policyManager.ownerOfPolicy(policyId);

            // Generate exit commitment hash
            bytes32 exitCommit = _generateExitCommitment(pool, lp, policyId);
            exitCommitmentHashes[policyId] = exitCommit;

            // Emit claim requested event
            emit ClaimRequested(policyId, exitCommit);
        }

        return IUniswapV4Hook.beforeRemoveLiquidity.selector;
    }

    /**
     * @notice Called after liquidity is removed from a pool
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterRemoveLiquidity(
        address, /* pool */
        address, /* lp */
        uint256, /* amount0 */
        uint256, /* amount1 */
        bytes calldata /* data */
    ) external override returns (bytes4) {
        // TODO: Post-removal cleanup if needed
        return IUniswapV4Hook.afterRemoveLiquidity.selector;
    }

    /**
     * @notice Called after a swap occurs in the pool
     * @dev This is where premium skimming happens
     * @param pool The pool where the swap occurred
     * @param feeGrowthGlobal0 Current fee growth for token0
     * @param feeGrowthGlobal1 Current fee growth for token1
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function afterSwap(address pool, uint128 feeGrowthGlobal0, uint128 feeGrowthGlobal1, bytes calldata /* data */ )
        external
        override
        nonReentrant
        returns (bytes4)
    {
        // Only skim premiums from whitelisted pools
        if (whitelistedPools[pool]) {
            // Extract premium using FeeSplitter
            uint256 premiumAmount =
                feeSplitter.extractPremium(pool, uint256(feeGrowthGlobal0), uint256(feeGrowthGlobal1));

            // Deposit premium to vault if amount > 0
            if (premiumAmount > 0) {
                insuranceVault.depositPremium(pool, premiumAmount);
                emit PremiumSkimmed(pool, premiumAmount);
            }
        }

        return IUniswapV4Hook.afterSwap.selector;
    }

    // =============================================================================
    //                             ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice Whitelist a pool for insurance coverage
     * @param pool The pool to whitelist
     */
    function whitelistPool(address pool) external onlyRole(ADMIN_ROLE) {
        whitelistedPools[pool] = true;

        // Initialize fee tracking in FeeSplitter
        feeSplitter.initializePool(pool, 0, 0);
    }

    /**
     * @notice Remove a pool from whitelist
     * @param pool The pool to remove from whitelist
     */
    function removeFromWhitelist(address pool) external onlyRole(ADMIN_ROLE) {
        whitelistedPools[pool] = false;
    }

    // =============================================================================
    //                           INTERNAL HELPER FUNCTIONS
    // =============================================================================

    /**
     * @notice Parse insurance enabled flag from hook data
     * @param data Hook data bytes
     * @return Whether insurance is enabled
     */
    function _parseInsuranceEnabled(bytes calldata data) internal pure returns (bool) {
        if (data.length == 0) {
            return false;
        }

        // First byte indicates insurance enabled
        return data[0] == 0x01;
    }

    /**
     * @notice Parse policy parameters from hook data
     * @param data Hook data bytes
     * @return PolicyParams struct with parsed or default values
     */
    function _parsePolicyParams(bytes calldata data) internal view returns (PolicyManager.PolicyParams memory) {
        PolicyManager.PolicyParams memory params;

        if (data.length >= 13) {
            // 1 byte flag + 3 * 4 bytes for uint32 params
            uint32 deductibleBps = uint32(bytes4(data[1:5]));
            uint32 capBps = uint32(bytes4(data[5:9]));
            uint32 premiumBps = uint32(bytes4(data[9:13]));

            params.deductibleBps = deductibleBps;
            params.capBps = capBps;
            params.premiumBps = premiumBps;
            params.duration = 100000; // Default duration
            params.pool = address(0); // Will be set by caller
        } else {
            // Use default parameters from PolicyManager
            params.deductibleBps = 1000; // 10%
            params.capBps = 5000; // 50%
            params.premiumBps = 3; // 0.03%
            params.duration = 100000; // ~2 weeks
            params.pool = address(0); // Will be set by caller
        }

        return params;
    }

    /**
     * @notice Parse policy ID from hook data (for removeLiquidity)
     * @param data Hook data bytes
     * @return Policy ID
     */
    function _parsePolicyId(bytes calldata data) internal pure returns (uint256) {
        if (data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }

    /**
     * @notice Generate commitment hash for position entry
     * @param pool Pool address
     * @param lp Liquidity provider address
     * @param amount0 Token0 amount
     * @param amount1 Token1 amount
     * @return Commitment hash
     */
    function _generateEntryCommitment(address pool, address lp, uint256 amount0, uint256 amount1)
        internal
        view
        returns (bytes32)
    {
        // For MVP: simple hash of position data + block info
        // In production: would be hash of encrypted FHE data
        return keccak256(abi.encodePacked(pool, lp, amount0, amount1, block.number, block.timestamp));
    }

    /**
     * @notice Generate commitment hash for position exit
     * @param pool Pool address
     * @param lp Liquidity provider address
     * @param policyId Policy ID
     * @return Exit commitment hash
     */
    function _generateExitCommitment(address pool, address lp, uint256 policyId) internal view returns (bytes32) {
        // For MVP: simple hash of exit data + block info
        // In production: would be hash of encrypted FHE exit data
        return keccak256(abi.encodePacked(pool, lp, policyId, block.number, block.timestamp));
    }
}

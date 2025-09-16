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
    error ClaimAlreadyExists();
    error InvalidClaimStatus();
    error ContractPaused();

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
    //                                ENUMS
    // =============================================================================

    enum ClaimStatus {
        None,
        Requested,
        Attested,
        Settled,
        Rejected
    }

    // =============================================================================
    //                                STRUCTS
    // =============================================================================

    struct ClaimData {
        ClaimStatus status;
        uint256 requestTimestamp;
        uint256 policyId;
        bytes32 exitCommit;
        address claimer;
        uint256 requestedAmount;
    }

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

    /// @notice Mapping of policy ID to claim data
    mapping(uint256 => ClaimData) public claims;

    /// @notice Emergency pause state
    bool public paused;

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
        if (paused) revert ContractPaused();

        // Check if this is an insured position (policyId > 0)
        if (policyId > 0) {
            // Validate policy exists
            if (commitmentHashes[policyId] == bytes32(0)) {
                revert PolicyNotFound();
            }

            // Check if claim already exists
            if (claims[policyId].status != ClaimStatus.None) {
                revert ClaimAlreadyExists();
            }

            // Get the LP address from policy
            address lp = policyManager.ownerOfPolicy(policyId);

            // Generate exit commitment hash with current pool state
            bytes32 exitCommit = _generateExitCommitment(pool, lp, policyId, data);
            exitCommitmentHashes[policyId] = exitCommit;

            // Create claim data
            claims[policyId] = ClaimData({
                status: ClaimStatus.Requested,
                requestTimestamp: block.timestamp,
                policyId: policyId,
                exitCommit: exitCommit,
                claimer: lp,
                requestedAmount: 0 // Will be calculated by fhenix service
            });

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
            try feeSplitter.extractPremium(pool, uint256(feeGrowthGlobal0), uint256(feeGrowthGlobal1)) returns (
                uint256 premiumAmount
            ) {
                // Deposit premium to vault if amount > 0
                if (premiumAmount > 0) {
                    try insuranceVault.depositPremium(pool, premiumAmount) {
                        emit PremiumSkimmed(pool, premiumAmount);
                    } catch {
                        // Log the failed premium deposit but don't revert the swap
                        emit PremiumSkimmed(pool, 0); // Indicates failed deposit
                    }
                }
            } catch {
                // If premium extraction fails, continue with the swap
                // This ensures that swap functionality is not compromised
            }
        }

        return IUniswapV4Hook.afterSwap.selector;
    }

    /**
     * @notice Called before a swap occurs - used by routers for quoting
     * @param pool The pool where the swap will occur
     * @param params Swap parameters
     * @param data Additional data passed to the hook
     * @return bytes4 The function selector to confirm the hook processed the call
     */
    function beforeSwap(address pool, SwapParams calldata params, bytes calldata data)
        external
        view
        override
        returns (bytes4)
    {
        // Routers can call this to predict gas usage and fees
        // This is a view function so it doesn't modify state

        if (!whitelistedPools[pool]) {
            return IUniswapV4Hook.beforeSwap.selector;
        }

        // Signal to router that this pool has premium extraction
        // Router can adjust gas estimates accordingly
        return IUniswapV4Hook.beforeSwap.selector;
    }

    // =============================================================================
    //                         ROUTER COMPATIBILITY
    // =============================================================================

    /**
     * @notice Returns the hook's permissions for routers to understand capabilities
     * @return Permissions The permissions this hook uses
     */
    function getHookPermissions() external pure returns (Permissions memory) {
        return Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true, // Routers need this for quoting
            afterSwap: true, // We use this for premium collection
            beforeDonate: false,
            afterDonate: false
        });
    }

    /**
     * @notice Quote the premium impact of a swap without executing it
     * @param pool The pool for the swap
     * @param amountIn Amount being swapped in
     * @return premiumFee The estimated premium fee
     */
    function quotePremiumImpact(address pool, uint256 amountIn) external view returns (uint256 premiumFee) {
        if (!whitelistedPools[pool]) {
            return 0;
        }

        // Calculate expected premium extraction
        return feeSplitter.calculateExpectedPremium(pool, amountIn);
    }

    /**
     * @notice Get the additional gas overhead this hook adds to swaps
     * @param pool The pool being quoted
     * @return gasOverhead Additional gas needed for hook execution
     */
    function getSwapGasOverhead(address pool) external view returns (uint256 gasOverhead) {
        if (!whitelistedPools[pool]) {
            return 0;
        }

        // Return estimated gas cost for premium extraction
        return 45000; // Approximate gas for afterSwap premium collection
    }

    /**
     * @notice Check if a pool supports insurance (router compatibility)
     * @param pool The pool address to check
     * @return supported Whether the pool supports insurance
     */
    function supportsInsurance(address pool) external view returns (bool supported) {
        return whitelistedPools[pool];
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
    function _generateExitCommitment(address pool, address lp, uint256 policyId, bytes calldata data)
        internal
        view
        returns (bytes32)
    {
        // For MVP: simple hash of exit data + block info
        // In production: would be hash of encrypted FHE exit data
        return keccak256(abi.encodePacked(pool, lp, policyId, block.number, block.timestamp, data));
    }

    // =============================================================================
    //                           CLAIM MANAGEMENT
    // =============================================================================

    /**
     * @notice Get claim status for a policy
     * @param policyId The policy ID to check
     * @return status The current claim status
     */
    function getClaimStatus(uint256 policyId) external view returns (ClaimStatus status) {
        status = claims[policyId].status;
    }

    /**
     * @notice Update claim status (admin only)
     * @param policyId The policy ID
     * @param newStatus The new status
     */
    function updateClaimStatus(uint256 policyId, ClaimStatus newStatus) external onlyRole(ADMIN_ROLE) {
        if (claims[policyId].status == ClaimStatus.None) {
            revert PolicyNotFound();
        }

        ClaimStatus currentStatus = claims[policyId].status;

        // Validate state transition
        if (
            newStatus == ClaimStatus.None || (currentStatus == ClaimStatus.Settled && newStatus != ClaimStatus.Settled)
                || (currentStatus == ClaimStatus.Rejected && newStatus != ClaimStatus.Rejected)
        ) {
            revert InvalidClaimStatus();
        }

        claims[policyId].status = newStatus;
    }

    /**
     * @notice Emergency pause toggle (admin only)
     */
    function togglePause() external onlyRole(ADMIN_ROLE) {
        paused = !paused;
    }
}

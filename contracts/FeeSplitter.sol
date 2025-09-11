// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FeeSplitter
 * @notice Handles premium extraction from Uniswap V4 swap fees
 * @dev Calculates premium based on fee growth and transfers to InsuranceVault
 */
contract FeeSplitter is AccessControl {
    // =============================================================================
    //                               ACCESS CONTROL
    // =============================================================================

    bytes32 public constant HOOK_ROLE = keccak256("HOOK_ROLE");

    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error UnauthorizedCaller();
    error InvalidPool();
    error InvalidAmount();
    error TransferFailed();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================

    /// @notice Emitted when premium is extracted and sent to vault
    event PremiumExtracted(address indexed pool, uint256 amount, uint256 feeGrowthGlobal0, uint256 feeGrowthGlobal1);

    /// @notice Emitted when premium rate is updated for a pool
    event PremiumRateUpdated(address indexed pool, uint256 newRate);

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice Address of the InsuranceVault
    address public insuranceVault;

    /// @notice Default premium rate in basis points (3 bps = 0.03%)
    uint256 public constant DEFAULT_PREMIUM_BPS = 3;

    /// @notice Mapping of pool to premium rate in basis points
    mapping(address => uint256) public poolPremiumRates;

    /// @notice Mapping of pool to last recorded fee growth for token0
    mapping(address => uint256) public lastFeeGrowthGlobal0;

    /// @notice Mapping of pool to last recorded fee growth for token1
    mapping(address => uint256) public lastFeeGrowthGlobal1;

    /// @notice Mapping of pool to whether it's initialized
    mapping(address => bool) public poolInitialized;

    // =============================================================================
    //                               CONSTRUCTOR
    // =============================================================================

    constructor(address admin, address _insuranceVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        insuranceVault = _insuranceVault;
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Extract premium from swap fees and send to vault
     * @param pool The pool address
     * @param feeGrowthGlobal0 Current fee growth for token0
     * @param feeGrowthGlobal1 Current fee growth for token1
     * @return premiumAmount The amount of premium extracted
     */
    function extractPremium(address pool, uint256 feeGrowthGlobal0, uint256 feeGrowthGlobal1)
        external
        onlyRole(HOOK_ROLE)
        returns (uint256 premiumAmount)
    {
        if (pool == address(0)) {
            revert InvalidPool();
        }

        // Initialize pool tracking if first time
        if (!poolInitialized[pool]) {
            lastFeeGrowthGlobal0[pool] = feeGrowthGlobal0;
            lastFeeGrowthGlobal1[pool] = feeGrowthGlobal1;
            poolInitialized[pool] = true;
            poolPremiumRates[pool] = DEFAULT_PREMIUM_BPS;
            return 0; // No premium on first initialization
        }

        // Calculate fee growth delta
        uint256 deltaFeeGrowth0 = feeGrowthGlobal0 - lastFeeGrowthGlobal0[pool];
        uint256 deltaFeeGrowth1 = feeGrowthGlobal1 - lastFeeGrowthGlobal1[pool];

        // Calculate premium (simplified: use average of both token fee growths)
        uint256 avgDeltaFeeGrowth = (deltaFeeGrowth0 + deltaFeeGrowth1) / 2;
        uint256 premiumRate = poolPremiumRates[pool];

        // Premium = (average fee growth delta) * (premium rate) / 10000
        premiumAmount = (avgDeltaFeeGrowth * premiumRate) / 10000;

        // Update last recorded fee growth
        lastFeeGrowthGlobal0[pool] = feeGrowthGlobal0;
        lastFeeGrowthGlobal1[pool] = feeGrowthGlobal1;

        // Send premium to vault if amount > 0
        if (premiumAmount > 0) {
            // For MVP: we'll assume the hook contract has the funds and will transfer them
            // In real implementation, this would interact with Uniswap's fee collection
            _transferPremiumToVault(pool, premiumAmount);
        }

        emit PremiumExtracted(pool, premiumAmount, feeGrowthGlobal0, feeGrowthGlobal1);

        return premiumAmount;
    }

    /**
     * @notice Initialize fee tracking for a new pool
     * @param pool The pool address
     * @param feeGrowthGlobal0 Initial fee growth for token0
     * @param feeGrowthGlobal1 Initial fee growth for token1
     */
    function initializePool(address pool, uint256 feeGrowthGlobal0, uint256 feeGrowthGlobal1)
        external
        onlyRole(HOOK_ROLE)
    {
        if (poolInitialized[pool]) {
            return; // Already initialized
        }

        lastFeeGrowthGlobal0[pool] = feeGrowthGlobal0;
        lastFeeGrowthGlobal1[pool] = feeGrowthGlobal1;
        poolInitialized[pool] = true;
        poolPremiumRates[pool] = DEFAULT_PREMIUM_BPS;
    }

    /**
     * @notice Set premium rate for a specific pool
     * @param pool The pool address
     * @param premiumBps Premium rate in basis points
     */
    function setPremiumRate(address pool, uint256 premiumBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (premiumBps > 1000) {
            // Max 10% premium rate
            revert InvalidAmount();
        }

        poolPremiumRates[pool] = premiumBps;
        emit PremiumRateUpdated(pool, premiumBps);
    }

    // =============================================================================
    //                            VIEW FUNCTIONS
    // =============================================================================

    /**
     * @notice Get premium rate for a pool
     * @param pool The pool address
     * @return Premium rate in basis points
     */
    function getPremiumRate(address pool) external view returns (uint256) {
        return poolInitialized[pool] ? poolPremiumRates[pool] : DEFAULT_PREMIUM_BPS;
    }

    /**
     * @notice Calculate potential premium for given fee growth
     * @param pool The pool address
     * @param feeGrowthGlobal0 Fee growth for token0
     * @param feeGrowthGlobal1 Fee growth for token1
     * @return Estimated premium amount
     */
    function estimatePremium(address pool, uint256 feeGrowthGlobal0, uint256 feeGrowthGlobal1)
        external
        view
        returns (uint256)
    {
        if (!poolInitialized[pool]) {
            return 0;
        }

        uint256 deltaFeeGrowth0 = feeGrowthGlobal0 - lastFeeGrowthGlobal0[pool];
        uint256 deltaFeeGrowth1 = feeGrowthGlobal1 - lastFeeGrowthGlobal1[pool];
        uint256 avgDeltaFeeGrowth = (deltaFeeGrowth0 + deltaFeeGrowth1) / 2;
        uint256 premiumRate = poolPremiumRates[pool];

        return (avgDeltaFeeGrowth * premiumRate) / 10000;
    }

    // =============================================================================
    //                           INTERNAL FUNCTIONS
    // =============================================================================

    /**
     * @notice Transfer premium to vault (internal)
     * @param pool The pool address
     * @param amount The premium amount
     */
    function _transferPremiumToVault(address pool, uint256 amount) internal {
        // For MVP: this is a placeholder
        // In real implementation, this would:
        // 1. Collect fees from Uniswap V4 pool
        // 2. Calculate exact premium amount in appropriate tokens
        // 3. Transfer to InsuranceVault via depositPremium()

        // For now, we'll just emit the event
        // The actual transfer will be handled by the hook contract
    }

    // =============================================================================
    //                            ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice Update insurance vault address
     * @param newVault The new vault address
     */
    function updateInsuranceVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newVault == address(0)) {
            revert InvalidAmount();
        }

        insuranceVault = newVault;
    }
}

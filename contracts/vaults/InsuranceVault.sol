// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InsuranceVault
 * @notice Holds insurance premiums and processes claim payouts
 * @dev Integrates with the ConfidentialILHook for automated premium collection
 */
contract InsuranceVault is ReentrancyGuard, AccessControl {
    // =============================================================================
    //                               ACCESS CONTROL
    // =============================================================================

    bytes32 public constant HOOK_ROLE = keccak256("HOOK_ROLE");
    bytes32 public constant AVS_ROLE = keccak256("AVS_ROLE");

    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================

    error InsufficientReserves();
    error UnauthorizedCaller();
    error InvalidAmount();
    error PolicyNotFound();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================

    /// @notice Emitted when premiums are deposited into the vault
    event PremiumSkimmed(address indexed pool, uint256 amount);

    /// @notice Emitted when a claim is paid out
    event ClaimPaid(uint256 indexed policyId, address indexed to, uint256 amount);

    /// @notice Emitted when reserves are deposited for a pool
    event ReservesDeposited(address indexed pool, uint256 amount);

    // =============================================================================
    //                                STORAGE
    // =============================================================================

    /// @notice Mapping of pool address to total reserves
    mapping(address => uint256) public reserves;

    /// @notice Total reserves across all pools
    uint256 public totalReserves;

    /// @notice Mapping of pool address to total premiums collected
    mapping(address => uint256) public totalPremiumsCollected;

    /// @notice Mapping of pool address to total claims paid
    mapping(address => uint256) public totalClaimsPaid;

    /// @notice Mapping of policy ID to whether it has been paid
    mapping(uint256 => bool) public claimsPaid;

    // =============================================================================
    //                               CONSTRUCTOR
    // =============================================================================

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Deposit premiums collected from swap fees
     * @param pool The pool from which premiums were collected
     * @param amount The amount of premiums to deposit
     */
    function depositPremium(address pool, uint256 amount) external onlyRole(HOOK_ROLE) {
        if (amount == 0) {
            revert InvalidAmount();
        }

        reserves[pool] += amount;
        totalReserves += amount;
        totalPremiumsCollected[pool] += amount;

        emit PremiumSkimmed(pool, amount);
    }

    /**
     * @notice Deposit funds directly into the vault for initial reserves
     * @dev Only admin can deposit initial funds
     */
    function depositFunds() external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        if (msg.value == 0) {
            revert InvalidAmount();
        }

        totalReserves += msg.value;

        emit ReservesDeposited(address(0), msg.value);
    }

    /**
     * @notice Check if the vault has sufficient reserves for a payout
     * @param payout The payout amount to check
     * @return bool Whether the vault can cover the payout
     */
    function solventFor(uint256 payout) public view returns (bool) {
        return totalReserves >= payout;
    }

    /**
     * @notice Pay a claim for an IL insurance policy
     * @param policyId The policy ID being claimed
     * @param amount The amount to pay out
     */
    function payClaim(uint256 policyId, uint256 amount) external onlyRole(AVS_ROLE) nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }

        if (claimsPaid[policyId]) {
            revert PolicyNotFound(); // Already paid
        }

        if (!solventFor(amount)) {
            revert InsufficientReserves();
        }

        // Mark claim as paid
        claimsPaid[policyId] = true;

        // Update reserves
        totalReserves -= amount;

        // Update claims tracking
        totalClaimsPaid[address(0)] += amount;

        // For MVP: Send ETH back to AVS manager (which will handle forwarding)
        // In production: This would integrate with PolicyManager to get policy owner
        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) {
            revert InvalidAmount(); // Revert if transfer fails
        }

        emit ClaimPaid(policyId, msg.sender, amount);
    }

    // =============================================================================
    //                             VIEW FUNCTIONS
    // =============================================================================

    /**
     * @notice Get the reserve ratio for a specific pool
     * @param pool The pool to check
     * @return ratio The reserve ratio (reserves / total premiums collected)
     */
    function getReserveRatio(address pool) external view returns (uint256 ratio) {
        if (totalPremiumsCollected[pool] == 0) {
            return 0;
        }
        return (reserves[pool] * 10000) / totalPremiumsCollected[pool]; // basis points
    }

    /**
     * @notice Get vault statistics for a pool
     * @param pool The pool to get stats for
     * @return totalReserves_ The total reserves for the pool
     * @return totalPremiums The total premiums collected for the pool
     * @return totalClaims The total claims paid for the pool
     */
    function getPoolStats(address pool)
        external
        view
        returns (uint256 totalReserves_, uint256 totalPremiums, uint256 totalClaims)
    {
        return (reserves[pool], totalPremiumsCollected[pool], totalClaimsPaid[pool]);
    }

    // =============================================================================
    //                             ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice Grant hook role to an address (typically the ConfidentialILHook)
     * @param hook The address to grant the role to
     */
    function grantHookRole(address hook) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(HOOK_ROLE, hook);
    }

    /**
     * @notice Grant AVS role to an address (typically the EigenAVSManager)
     * @param avs The address to grant the role to
     */
    function grantAVSRole(address avs) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(AVS_ROLE, avs);
    }

    /**
     * @notice Emergency function to pause the contract (if needed)
     * @dev This is a placeholder for governance-controlled emergency stops
     */
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO: Implement emergency pause mechanism
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// import "./interfaces/ILocalUniswapV4Hook.sol";

import "@openzeppelin/contracts/utils/Context.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IInsuranceVault.sol";
import "./interfaces/IPolicyManager.sol";

/**
 * @title InsuranceVault
 * @notice Manages insurance funds, premium deposits, and claim payouts
 * @dev Handles ETH and ERC20 token deposits/withdrawals for IL insurance
 */
contract InsuranceVault is IInsuranceVault, AccessControl, ReentrancyGuard, Pausable {
    // Insurance vault contract with access control and safety features

    // Roles
    bytes32 public constant PREMIUM_DEPOSITOR_ROLE = keccak256("PREMIUM_DEPOSITOR_ROLE");
    bytes32 public constant CLAIM_PAYER_ROLE = keccak256("CLAIM_PAYER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // State variables
    IPolicyManager public immutable policyManager;

    /// @notice Total premiums collected per pool
    mapping(address => uint256) public override totalPremiumsCollected;

    /// @notice Available reserves per pool (premiums - paid claims)
    mapping(address => uint256) public override reserves;

    /// @notice Total claims paid per pool
    mapping(address => uint256) public totalClaimsPaid;

    /// @notice Total claims paid per policy
    mapping(uint256 => uint256) public policyClaimsPaid;

    /// @notice Emergency withdrawal limit per pool
    mapping(address => uint256) public emergencyWithdrawalLimit;

    /// @notice Minimum reserve ratio (basis points, 10000 = 100%)
    uint256 public minimumReserveRatio = 2000; // 20%

    /// @notice Maximum claim payout ratio per policy (basis points)
    uint256 public maxClaimRatio = 8000; // 80% of policy coverage

    // Events
    event PremiumDeposited(address indexed pool, uint256 amount, address indexed depositor);
    event ClaimPaid(uint256 indexed policyId, address indexed recipient, uint256 amount, address indexed pool);
    event ReserveRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event MaxClaimRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event EmergencyWithdrawal(address indexed pool, uint256 amount, address indexed recipient);
    event FundsDeposited(address indexed depositor, uint256 amount);

    // Errors
    error InsufficientReserves(address pool, uint256 available, uint256 requested);
    error InvalidClaimAmount(uint256 policyId, uint256 requested, uint256 maximum);
    error PolicyNotFound(uint256 policyId);
    error InvalidPool(address pool);
    error InvalidRatio(uint256 ratio);
    error TransferFailed();
    error ZeroAmount();
    error ReserveRatioViolation(address pool, uint256 currentRatio, uint256 minimumRatio);

    constructor(address _policyManager, address _admin, address _premiumDepositor, address _claimPayer) {
        if (_policyManager == address(0) || _admin == address(0)) revert InvalidPool(address(0));

        policyManager = IPolicyManager(_policyManager);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PREMIUM_DEPOSITOR_ROLE, _premiumDepositor);
        _grantRole(CLAIM_PAYER_ROLE, _claimPayer);
        _grantRole(EMERGENCY_ROLE, _admin);
    }

    /**
     * @notice Deposit premiums collected from swap fees
     * @param pool The pool from which premiums were collected
     * @param amount The amount of premiums to deposit
     */
    function depositPremium(address pool, uint256 amount)
        external
        payable
        override
        onlyRole(PREMIUM_DEPOSITOR_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (pool == address(0)) revert InvalidPool(pool);
        if (amount == 0) revert ZeroAmount();

        // Transfer ETH or tokens from fee splitter
        // For MVP, assuming ETH deposits
        if (msg.value != amount) revert TransferFailed();

        totalPremiumsCollected[pool] += amount;
        reserves[pool] += amount;

        emit PremiumDeposited(pool, amount, msg.sender);
    }

    /**
     * @notice Pay claim for a specific policy
     * @param policyId The policy ID for which to pay the claim
     * @param amount The amount to pay
     */
    function payClaim(uint256 policyId, uint256 amount)
        external
        override
        onlyRole(CLAIM_PAYER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert ZeroAmount();

        // Get policy details from PolicyManager
        (address policyHolder, address pool, uint256 coverage,, bool active) = policyManager.getPolicyDetails(policyId);

        if (policyHolder == address(0)) revert PolicyNotFound(policyId);
        if (!active) revert PolicyNotFound(policyId);

        // Validate claim amount
        uint256 maxPayout = (coverage * maxClaimRatio) / 10000;
        uint256 totalPaid = policyClaimsPaid[policyId] + amount;
        if (totalPaid > maxPayout) {
            revert InvalidClaimAmount(policyId, totalPaid, maxPayout);
        }

        // Check available reserves
        if (reserves[pool] < amount) {
            revert InsufficientReserves(pool, reserves[pool], amount);
        }

        // Check reserve ratio after payout
        uint256 newReserves = reserves[pool] - amount;
        uint256 newRatio = (newReserves * 10000) / totalPremiumsCollected[pool];
        if (newRatio < minimumReserveRatio) {
            revert ReserveRatioViolation(pool, newRatio, minimumReserveRatio);
        }

        // Update state
        reserves[pool] -= amount;
        totalClaimsPaid[pool] += amount;
        policyClaimsPaid[policyId] += amount;

        // Transfer funds
        (bool success,) = payable(policyHolder).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit ClaimPaid(policyId, policyHolder, amount, pool);
    }

    /**
     * @notice Deposit funds to the vault (for initial capitalization)
     * @dev Can be called by anyone to add liquidity to the vault
     */
    function depositFunds() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();

        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Emergency withdrawal for specific pool
     * @param pool The pool to withdraw from
     * @param amount The amount to withdraw
     * @param recipient The recipient of the withdrawal
     */
    function emergencyWithdraw(address pool, uint256 amount, address payable recipient)
        external
        onlyRole(EMERGENCY_ROLE)
        nonReentrant
    {
        if (pool == address(0) || recipient == address(0)) revert InvalidPool(address(0));
        if (amount == 0) revert ZeroAmount();
        if (amount > emergencyWithdrawalLimit[pool]) {
            revert InsufficientReserves(pool, emergencyWithdrawalLimit[pool], amount);
        }

        reserves[pool] -= amount;
        emergencyWithdrawalLimit[pool] -= amount;

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EmergencyWithdrawal(pool, amount, recipient);
    }

    /**
     * @notice Set minimum reserve ratio
     * @param newRatio New minimum reserve ratio in basis points
     */
    function setMinimumReserveRatio(uint256 newRatio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newRatio > 10000) revert InvalidRatio(newRatio);

        uint256 oldRatio = minimumReserveRatio;
        minimumReserveRatio = newRatio;

        emit ReserveRatioUpdated(oldRatio, newRatio);
    }

    /**
     * @notice Set maximum claim ratio per policy
     * @param newRatio New maximum claim ratio in basis points
     */
    function setMaxClaimRatio(uint256 newRatio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newRatio > 10000) revert InvalidRatio(newRatio);

        uint256 oldRatio = maxClaimRatio;
        maxClaimRatio = newRatio;

        emit MaxClaimRatioUpdated(oldRatio, newRatio);
    }

    /**
     * @notice Set emergency withdrawal limit for a pool
     * @param pool The pool address
     * @param limit The withdrawal limit
     */
    function setEmergencyWithdrawalLimit(address pool, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emergencyWithdrawalLimit[pool] = limit;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }

    /**
     * @notice Get vault statistics for a pool
     * @param pool The pool address
     * @return totalPremiums Total premiums collected
     * @return availableReserves Available reserves
     * @return totalPaid Total claims paid
     * @return reserveRatio Current reserve ratio (basis points)
     */
    function getVaultStats(address pool)
        external
        view
        returns (uint256 totalPremiums, uint256 availableReserves, uint256 totalPaid, uint256 reserveRatio)
    {
        totalPremiums = totalPremiumsCollected[pool];
        availableReserves = reserves[pool];
        totalPaid = totalClaimsPaid[pool];

        if (totalPremiums > 0) {
            reserveRatio = (availableReserves * 10000) / totalPremiums;
        } else {
            reserveRatio = 10000; // 100% if no premiums collected yet
        }
    }

    /**
     * @notice Get policy claim information
     * @param policyId The policy ID
     * @return totalPaid Total amount paid for this policy
     * @return remainingCoverage Remaining coverage available
     */
    function getPolicyClaimInfo(uint256 policyId)
        external
        view
        returns (uint256 totalPaid, uint256 remainingCoverage)
    {
        totalPaid = policyClaimsPaid[policyId];

        (,, uint256 coverage,, bool active) = policyManager.getPolicyDetails(policyId);

        if (active) {
            uint256 maxPayout = (coverage * maxClaimRatio) / 10000;
            remainingCoverage = maxPayout > totalPaid ? maxPayout - totalPaid : 0;
        } else {
            remainingCoverage = 0;
        }
    }

    /**
     * @notice Check if a claim amount is valid for a policy
     * @param policyId The policy ID
     * @param amount The claim amount
     * @return valid Whether the claim is valid
     * @return reason Reason if claim is invalid
     */
    function validateClaim(uint256 policyId, uint256 amount) external view returns (bool valid, string memory reason) {
        if (amount == 0) {
            return (false, "Zero amount");
        }

        (address policyHolder, address pool, uint256 coverage,, bool active) = policyManager.getPolicyDetails(policyId);

        if (policyHolder == address(0)) {
            return (false, "Policy not found");
        }

        if (!active) {
            return (false, "Policy not active");
        }

        uint256 maxPayout = (coverage * maxClaimRatio) / 10000;
        uint256 totalPaid = policyClaimsPaid[policyId] + amount;

        if (totalPaid > maxPayout) {
            return (false, "Exceeds maximum payout");
        }

        if (reserves[pool] < amount) {
            return (false, "Insufficient reserves");
        }

        uint256 newReserves = reserves[pool] - amount;
        uint256 newRatio =
            totalPremiumsCollected[pool] > 0 ? (newReserves * 10000) / totalPremiumsCollected[pool] : 10000;

        if (newRatio < minimumReserveRatio) {
            return (false, "Would violate reserve ratio");
        }

        return (true, "");
    }

    /**
     * @notice Receive ETH deposits
     */
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Fallback function
     */
    fallback() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}

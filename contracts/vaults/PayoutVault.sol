// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title PayoutVault
 * @notice Separate vault for handling claim payouts with additional security measures
 * @dev This vault provides an additional layer of separation for payout processing
 */
contract PayoutVault {
    // =============================================================================
    //                               CUSTOM ERRORS
    // =============================================================================
    
    error UnauthorizedCaller();
    error InsufficientBalance();
    error InvalidAmount();
    error TransferFailed();

    // =============================================================================
    //                                  EVENTS
    // =============================================================================
    
    /// @notice Emitted when funds are transferred to this vault
    event FundsReceived(address indexed from, uint256 amount);
    
    /// @notice Emitted when a payout is processed
    event PayoutProcessed(uint256 indexed policyId, address indexed to, uint256 amount);

    // =============================================================================
    //                                STORAGE
    // =============================================================================
    
    /// @notice Address authorized to request payouts (typically InsuranceVault)
    address public authorizedCaller;
    
    /// @notice Total balance in the vault
    uint256 public totalBalance;
    
    /// @notice Owner of the contract
    address public owner;

    // =============================================================================
    //                               MODIFIERS
    // =============================================================================
    
    modifier onlyAuthorized() {
        if (msg.sender != authorizedCaller) {
            revert UnauthorizedCaller();
        }
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert UnauthorizedCaller();
        }
        _;
    }

    // =============================================================================
    //                               CONSTRUCTOR
    // =============================================================================
    
    constructor(address _authorizedCaller) {
        authorizedCaller = _authorizedCaller;
        owner = msg.sender;
    }

    // =============================================================================
    //                            CORE FUNCTIONS
    // =============================================================================

    /**
     * @notice Receive funds into the vault
     */
    receive() external payable {
        totalBalance += msg.value;
        emit FundsReceived(msg.sender, msg.value);
    }

    /**
     * @notice Process a payout to a policy holder
     * @param policyId The policy ID for tracking
     * @param to The address to send funds to
     * @param amount The amount to send
     */
    function processPayout(
        uint256 policyId,
        address to,
        uint256 amount
    ) external onlyAuthorized {
        if (amount == 0) {
            revert InvalidAmount();
        }
        
        if (amount > totalBalance) {
            revert InsufficientBalance();
        }

        totalBalance -= amount;

        // TODO: Implement actual ETH/token transfer
        // For now, this is a placeholder for the payout logic
        
        emit PayoutProcessed(policyId, to, amount);
    }

    // =============================================================================
    //                             VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Check if the vault can cover a specific payout amount
     * @param amount The amount to check
     * @return bool Whether the vault has sufficient balance
     */
    function canCoverPayout(uint256 amount) external view returns (bool) {
        return amount <= totalBalance;
    }

    // =============================================================================
    //                             ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update the authorized caller address
     * @param newCaller The new authorized caller address
     */
    function updateAuthorizedCaller(address newCaller) external onlyOwner {
        authorizedCaller = newCaller;
    }
    
    /**
     * @notice Emergency withdraw function for owner
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        if (amount > totalBalance) {
            revert InsufficientBalance();
        }
        
        totalBalance -= amount;
        
        // TODO: Implement actual withdrawal
        // payable(owner).transfer(amount);
    }
}

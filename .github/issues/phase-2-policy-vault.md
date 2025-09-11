# Phase 2: Core Policy & Vault Implementation

## Epic Overview

Implement the PolicyManager (ERC-1155), InsuranceVault core functionality, and basic ConfidentialILHook callbacks for policy minting and premium skimming.

## Acceptance Criteria

- [ ] PolicyManager contract implements ERC-1155 with policy minting
- [ ] InsuranceVault handles premium deposits and basic payout structure
- [ ] ConfidentialILHook implements afterAddLiquidity and afterSwap callbacks
- [ ] Frontend UI can mint policies with mocked pool interaction
- [ ] All contracts emit required events
- [ ] Unit tests cover policy creation and basic vault operations

## Technical Requirements

### PolicyManager Contract (ERC-1155)

- [ ] Inherit from OpenZeppelin ERC-1155
- [ ] `mintPolicy(address lp, address pool, PolicyParams params, bytes32 entryCommit) -> uint256 policyId`
- [ ] `burnPolicy(uint256 policyId) external`
- [ ] `ownerOfPolicy(uint256 policyId) -> address`
- [ ] `PolicyParams` struct with deductibleBps, capBps, premiumBps
- [ ] Events: `PolicyCreated(uint256 policyId, address lp, address pool, uint256 epoch)`
- [ ] Policy metadata and URI functions

### InsuranceVault Contract

- [ ] `depositPremium(address pool, uint256 amount) external`
- [ ] `solventFor(uint256 payout) public view returns (bool)`
- [ ] `payClaim(uint256 policyId, address to, uint256 amount) external onlyAuthorized`
- [ ] Storage: `mapping(address pool => uint256) reserves`
- [ ] Events: `PremiumSkimmed(address pool, uint256 amount)`, `ClaimPaid(...)`
- [ ] Access control for authorized payout callers
- [ ] ReentrancyGuard on payout functions

### ConfidentialILHook Core Callbacks

- [ ] Implement IUniswapV4Hook interface
- [ ] `afterAddLiquidity(...)` - call PolicyManager.mintPolicy when insurance enabled
- [ ] `afterSwap(...)` - compute premium delta and call vault.depositPremium
- [ ] Basic pool whitelisting in `beforeInitialize`/`afterInitialize`
- [ ] Store commitment hashes for encrypted position snapshots
- [ ] Emit `ClaimRequested` event structure (placeholder)

### Premium Calculation Logic

- [ ] FeeSplitter contract or library for premium extraction
- [ ] Calculate premium based on fee growth and configurable basis points
- [ ] Default premium_bps = 3 bps (configurable)
- [ ] Integration with vault deposit mechanism

### Frontend Policy UI

- [ ] `PremiumCard.tsx` - show premium quote and mint policy transaction
- [ ] `PolicyCard.tsx` - display policy status, premium paid, terms
- [ ] Mocked pool interaction for demonstration
- [ ] "Insure this position" checkbox with premium estimation
- [ ] Transaction progress indicators

### Smart Contract Security

- [ ] Custom errors instead of revert strings
- [ ] Checks-effects-interactions pattern
- [ ] ReentrancyGuard where needed
- [ ] Access control modifiers
- [ ] Input validation on all external functions

## Test Requirements

- [ ] Unit tests for PolicyManager mint/burn operations
- [ ] Unit tests for InsuranceVault deposit/payout with access control
- [ ] Unit tests for hook callbacks with event emissions
- [ ] Mock Uniswap v4 pool interactions
- [ ] Gas usage optimization tests
- [ ] Edge case testing (zero amounts, invalid addresses)

## Integration Points

- [ ] Hook -> PolicyManager for policy creation
- [ ] Hook -> InsuranceVault for premium deposits
- [ ] Frontend -> Contract interactions via ethers.js
- [ ] Event listening for policy creation confirmation

## Definition of Done

- [ ] All contracts compile without warnings
- [ ] Unit test coverage ≥80% for implemented functions
- [ ] Frontend can successfully mint a policy on local Foundry network
- [ ] Premium skimming works in afterSwap callback
- [ ] All required events are emitted with correct data
- [ ] No security vulnerabilities in static analysis

## Dependencies

- Phase 1 completion (bootstrap)
- OpenZeppelin contracts (as Foundry library)
- Uniswap v4 interfaces
- Foundry for testing and development

## Estimated Time

4-5 days

## Priority

P0 - Critical Path

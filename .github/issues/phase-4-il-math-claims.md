# Phase 4: IL Math & Claim Request Flow

## Epic Overview

Implement the Impermanent Loss calculation library, beforeRemoveLiquidity claim initiation, mock Fhenix service, and basic indexer for event processing.

## Acceptance Criteria

- [ ] ILMath.sol library implements all IL calculation formulas
- [ ] beforeRemoveLiquidity hook triggers ClaimRequested event
- [ ] Mock fhenix-service responds to claim computation requests
- [ ] Event indexer skeleton processes PolicyCreated and ClaimRequested events
- [ ] IL calculations are mathematically verified with property tests

## Technical Requirements

### ILMath Library (Solidity)

```solidity
library ILMath {
    function calculateHodlValue(uint256 x0, uint256 y0, uint256 P1) -> uint256 V_hodl
    function calculateLPValue(uint256 x1, uint256 y1, uint256 fees, uint256 P1) -> uint256 V_lp
    function calculateIL(uint256 V_hodl, uint256 V_lp) -> uint256 IL
    function calculatePayout(uint256 IL, uint256 V_hodl, uint16 capBps, uint16 deductibleBps) -> uint256
}
```

Formulas to implement:

- [ ] `V_hodl = x0 * P1 + y0`
- [ ] `V_lp = x1 * P1 + y1 + fees`
- [ ] `IL = max(0, V_hodl - V_lp)`
- [ ] `Payout = min(capBps * V_hodl / 10_000, max(0, IL - deductibleBps * IL / 10_000))`

### Hook Claim Initiation

- [ ] `beforeRemoveLiquidity(address pool, uint256 policyId, bytes calldata data) -> bytes4`
- [ ] Lock policy to prevent double-claims
- [ ] Generate `exitCommit` hash for position exit state
- [ ] Emit `ClaimRequested(uint256 policyId, bytes32 commitmentC)`
- [ ] Store claim metadata for indexer processing
- [ ] Input validation and access control

### Mock Fhenix Service (Node.js/TypeScript)

API Endpoint: `POST /api/compute-claim`

- [ ] Express.js server setup in `fhenix-service/src/`
- [ ] Request validation with Zod schema:
  ```typescript
  {
    policyId: number,
    entryCommit: string,
    exitCommit: string,
    publicRefs: { twapRoot: string, pool: string }
  }
  ```
- [ ] Response format:
  ```typescript
  {
    policyId: number,
    payout: string,
    auditHash: string,
    fhenixSignature: string, // ECDSA for MVP
    workerId: string
  }
  ```
- [ ] Mock IL calculation using public data
- [ ] ECDSA signature generation for attestation
- [ ] Error handling and logging
- [ ] Environment configuration (.env support)

### Event Indexer Skeleton

- [ ] Node.js service in `scripts/` or separate directory
- [ ] ethers.js contract event listeners
- [ ] Listen for events: `PolicyCreated`, `ClaimRequested`
- [ ] Event processor workflow:
  - `ClaimRequested` → call fhenix-service
  - Store results in memory/simple DB
  - Trigger AVS flow (Phase 5)
- [ ] Basic retry mechanism for failed requests
- [ ] Logging and error handling

### Claim Flow State Management

- [ ] Enum: `ClaimStatus { None, Requested, Attested, Settled, Rejected }`
- [ ] Mapping: `claims[policyId] -> ClaimData`
- [ ] Claim metadata struct with timestamps and status
- [ ] State transitions and validation
- [ ] Emergency pause functionality

## Test Requirements

### IL Math Property Tests

- [ ] Fuzz test IL calculations with random price movements
- [ ] Verify payout always <= capBps \* V_hodl
- [ ] Verify deductible is properly applied
- [ ] Test edge cases: extreme prices, zero amounts, overflow scenarios
- [ ] Mathematical invariants: IL ≥ 0, Payout ≤ IL

### Hook Integration Tests

- [ ] Test beforeRemoveLiquidity event emission
- [ ] Test claim request with valid policy
- [ ] Test double-claim prevention
- [ ] Test unauthorized claim attempts
- [ ] Test claim with expired/invalid policy

### Mock Service Tests

- [ ] Test fhenix-service API endpoints
- [ ] Test signature generation and verification
- [ ] Test error responses for invalid requests
- [ ] Test concurrent request handling
- [ ] Integration test: indexer -> fhenix-service

### Mathematical Verification

- [ ] Unit tests for each ILMath function
- [ ] Known value testing with specific scenarios
- [ ] Boundary condition testing
- [ ] Gas efficiency testing for math operations

## Mock Data & Testing Scenarios

- [ ] Sample pool price movements for testing
- [ ] Mock TWAP data for different volatility scenarios
- [ ] Test data sets for various IL severity levels
- [ ] Edge case test vectors (extreme IL, zero IL, etc.)

## Integration Points

- [ ] Hook -> ILMath library for validation
- [ ] beforeRemoveLiquidity -> Event emission
- [ ] Indexer -> Fhenix service HTTP API
- [ ] Fhenix service -> Signature generation
- [ ] Future: Fhenix response -> AVS processing (Phase 5)

## Error Handling & Edge Cases

- [ ] Invalid policy ID in claim request
- [ ] Policy already claimed
- [ ] Insufficient vault reserves for payout
- [ ] Fhenix service unavailable
- [ ] Invalid signature in attestation
- [ ] Mathematical overflow in IL calculations

## Definition of Done

- [ ] ILMath library passes all property tests
- [ ] beforeRemoveLiquidity correctly initiates claim flow
- [ ] Mock fhenix-service responds correctly to valid requests
- [ ] Event indexer processes events and calls fhenix service
- [ ] Integration test covers full claim request flow
- [ ] All mathematical formulas are documented and verified
- [ ] Code coverage ≥80% for new components

## Dependencies

- Phase 3 completion (Fee Splitting)
- Express.js for mock service
- ethers.js for event listening
- Mathematical testing libraries (Foundry for fuzzing)

## Technical Debt & TODOs

- [ ] Replace ECDSA with FHE attestation format in production
- [ ] Add governance for IL calculation parameters
- [ ] Implement claim timeout mechanisms
- [ ] Add database persistence for indexer

## Estimated Time

4-5 days

## Priority

P0 - Critical Path

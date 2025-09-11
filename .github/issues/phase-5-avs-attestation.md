# Phase 5: EigenLayer AVS & Attestation Flow

## Epic Overview

Implement the complete AVS mock system, EigenAVSManager contract, and end-to-end integration from claim request through fhenix computation to final vault payout via AVS attestation.

## Acceptance Criteria

- [ ] EigenAVSManager contract verifies attestations and triggers payouts
- [ ] Mock AVS node processes fhenix attestations and generates IVS signatures
- [ ] Complete integration: ClaimRequested → Fhenix → AVS → submitAttestation → vault.payout
- [ ] Slashing mechanism implemented for misbehaving operators (mock)
- [ ] End-to-end integration tests cover the full attestation flow

## Technical Requirements

### EigenAVSManager Contract

```solidity
contract EigenAVSManager {
    function submitAttestation(
        uint256 policyId,
        bytes calldata fhenixSig,
        bytes calldata ivsSig,
        uint256 payout
    ) external;
    function verifyThreshold(bytes calldata ivsSig, bytes32 messageHash) internal returns (bool);
    function slashOperator(address operator, uint256 amount) external onlyOwner;
}
```

Core Functionality:

- [ ] ECDSA signature verification for fhenix attestations (MVP)
- [ ] Mock BLS threshold signature verification for IVS signatures
- [ ] Operator stake tracking and slashing mechanism
- [ ] Integration with InsuranceVault.payClaim()
- [ ] Events: `AttestationSubmitted`, `ClaimSettled`, `OperatorSlashed`
- [ ] Access control and operator management

### Mock AVS Node (Node.js/TypeScript)

- [ ] Service in `avs/src/` directory
- [ ] Listens for fhenix-service outputs or indexer triggers
- [ ] Verifies fhenix signature authenticity
- [ ] Generates mock IVS aggregated signatures
- [ ] Threshold logic: M-of-N operator consensus (configurable)
- [ ] Calls EigenAVSManager.submitAttestation() via ethers.js
- [ ] Operator simulation with individual ECDSA keys
- [ ] Error handling and retry mechanisms

### Signature Aggregation Logic

- [ ] Mock BLS signature aggregation (or simple ECDSA concatenation for MVP)
- [ ] Threshold requirement: minimum N operators must sign
- [ ] Message format standardization for signing
- [ ] Signature verification in smart contract
- [ ] Support for operator set updates

### Enhanced Integration Flow

1. **ClaimRequested Event** → Indexer detects
2. **Indexer** → Calls fhenix-service compute-claim
3. **Fhenix Response** → AVS node processes attestation
4. **AVS Node** → Verifies fhenix sig + generates IVS sig
5. **AVS Node** → Calls submitAttestation() on-chain
6. **EigenAVSManager** → Verifies both signatures
7. **EigenAVSManager** → Calls InsuranceVault.payClaim()

### Operator Economics & Slashing

- [ ] Mock operator stake tracking: `mapping(address => uint256) stakes`
- [ ] Slashing conditions: invalid attestation, double-signing
- [ ] Slash amount: configurable percentage of stake
- [ ] Stake delegation simulation (simplified)
- [ ] Operator registration and deregistration
- [ ] Economic incentives: reward operators for valid attestations

### Enhanced Indexer Service

- [ ] Complete event processing pipeline
- [ ] Workflow orchestration: Event → Fhenix → AVS → Settlement
- [ ] Error handling and retry logic
- [ ] Transaction monitoring and confirmation
- [ ] Rate limiting and request queuing
- [ ] Metrics and monitoring hooks

## Test Requirements

### Unit Tests - EigenAVSManager

- [ ] Test submitAttestation with valid signatures
- [ ] Test signature verification (fhenix + IVS)
- [ ] Test access control and operator management
- [ ] Test slashing mechanism
- [ ] Test integration with InsuranceVault
- [ ] Test event emissions

### Integration Tests - Full Flow

- [ ] End-to-end: add liquidity → insure → price change → remove liquidity → claim → payout
- [ ] Test with multiple operators (threshold scenarios)
- [ ] Test with invalid fhenix signatures (should fail)
- [ ] Test with insufficient IVS signatures (should fail)
- [ ] Test slashing for misbehavior
- [ ] Test vault solvency checks during payout

### AVS Node Tests

- [ ] Test fhenix signature verification
- [ ] Test IVS signature generation
- [ ] Test threshold consensus logic
- [ ] Test on-chain transaction submission
- [ ] Test error scenarios and retries
- [ ] Test operator key management

### Security Tests

- [ ] Test signature replay protection
- [ ] Test unauthorized attestation attempts
- [ ] Test double-spending prevention
- [ ] Test operator collusion scenarios
- [ ] Test vault reentrancy protection

## Mock Configuration

### Operator Setup (for testing)

- [ ] Generate 5 mock operator ECDSA key pairs
- [ ] Configure 3-of-5 threshold for IVS signatures
- [ ] Mock stake amounts: 32 ETH equivalent each
- [ ] Slashing rate: 10% for invalid attestations

### Test Scenarios

- [ ] Honest majority: 4/5 operators sign correctly
- [ ] Threshold edge case: exactly 3/5 operators sign
- [ ] Malicious minority: 2/5 operators provide invalid signatures
- [ ] Slashing scenario: operator provides conflicting attestations

## API Contracts

### Fhenix → AVS Interface

```typescript
interface FhenixAttestation {
  policyId: number;
  payout: string;
  auditHash: string;
  fhenixSignature: string;
  workerId: string;
}
```

### AVS → Contract Interface

```solidity
function submitAttestation(
    uint256 policyId,
    bytes calldata fhenixSig,    // ECDSA signature from fhenix
    bytes calldata ivsSig,       // Aggregated operator signatures
    uint256 payout
) external;
```

## Error Scenarios & Edge Cases

- [ ] Fhenix service returns invalid signature
- [ ] Insufficient operators online for threshold
- [ ] Operator stakes below minimum threshold
- [ ] Vault insufficient funds for payout
- [ ] Network issues during attestation submission
- [ ] Conflicting attestations from multiple sources

## Definition of Done

- [ ] EigenAVSManager contract deployed and functional
- [ ] Mock AVS node processes attestations correctly
- [ ] End-to-end integration test passes: claim → fhenix → avs → payout
- [ ] Slashing mechanism works for invalid attestations
- [ ] All signature verification works correctly
- [ ] Gas costs are optimized for frequent attestations
- [ ] Comprehensive error handling throughout the flow
- [ ] Code coverage ≥85% for new components

## Integration Points

- [ ] EigenAVSManager ↔ InsuranceVault (payout authorization)
- [ ] AVS Node ↔ Fhenix Service (attestation verification)
- [ ] AVS Node ↔ Blockchain (transaction submission)
- [ ] Indexer ↔ AVS Node (workflow orchestration)

## Dependencies

- Phase 4 completion (IL Math & Claims)
- Mock operator key generation
- ethers.js for blockchain interactions
- Express.js for AVS node API (if needed)

## Technical Debt & TODOs

- [ ] Replace ECDSA with actual BLS signatures in production
- [ ] Implement real EigenLayer operator registration
- [ ] Add proper economic incentives and reward distribution
- [ ] Implement dispute resolution mechanism
- [ ] Add operator performance tracking

## Estimated Time

5-6 days

## Priority

P0 - Critical Path

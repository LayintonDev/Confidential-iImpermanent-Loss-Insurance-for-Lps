# Phase 3: Fee Splitting & Premium Flow

## Epic Overview

Implement comprehensive premium collection through FeeSplitter, optimize the afterSwap premium flow, and create robust unit tests for the premium skimming mechanism.

## Acceptance Criteria

- [ ] FeeSplitter contract handles premium extraction from swap fees
- [ ] Premium flow from afterSwap -> FeeSplitter -> InsuranceVault is complete
- [ ] Unit tests comprehensively cover premium skimming and policy minting
- [ ] Premium calculation is accurate based on fee growth variables
- [ ] Gas optimization for high-frequency swap operations

## Technical Requirements

### FeeSplitter Contract

- [ ] `split(address pool, uint256 totalFees) external returns (uint256 premiumAmount)`
- [ ] Configurable premium basis points per pool
- [ ] Direct integration with InsuranceVault.depositPremium
- [ ] Event: `PremiumSplit(address pool, uint256 totalFees, uint256 premiumAmount)`
- [ ] Access control - only hook can call split function
- [ ] Support for different fee tiers and pools

### Enhanced Premium Flow

- [ ] Optimize `afterSwap` callback for gas efficiency
- [ ] Calculate premium delta from `feeGrowthGlobal0` and `feeGrowthGlobal1`
- [ ] Handle both token0 and token1 fees appropriately
- [ ] Aggregate premiums before vault deposit (batching)
- [ ] Error handling for vault deposit failures

### Premium Calculation Logic

- [ ] Library: `PremiumMath.sol` for fee calculations
- [ ] Function: `calculatePremiumFromFeeGrowth(...) -> uint256`
- [ ] Support for dynamic premium rates based on pool volatility (future-ready)
- [ ] Minimum premium threshold to avoid dust transactions
- [ ] Maximum premium cap per swap to prevent excessive fees

### Advanced Hook Integration

- [ ] Pool-specific configuration storage
- [ ] Premium rate configuration per pool type
- [ ] Integration with Uniswap v4 fee collection mechanics
- [ ] Proper handling of swap callback data
- [ ] Support for multi-hop swaps

### Smart Contract Optimizations

- [ ] Gas-efficient storage patterns
- [ ] Batch operations where possible
- [ ] Minimal external calls in hot paths
- [ ] Efficient event emission
- [ ] Assembly optimizations for math operations

## Test Requirements

### Unit Tests - Premium Skimming

- [ ] Test premium calculation with various fee growth scenarios
- [ ] Test FeeSplitter with different premium basis points
- [ ] Test afterSwap callback with mock pool data
- [ ] Test premium aggregation and batching
- [ ] Test edge cases: zero fees, maximum fees, dust amounts

### Unit Tests - Policy Minting Integration

- [ ] Test afterAddLiquidity -> policy creation flow
- [ ] Test policy minting with various pool configurations
- [ ] Test policy metadata and commitment storage
- [ ] Test policy ownership verification
- [ ] Test policy burning and cleanup

### Integration Tests

- [ ] End-to-end: add liquidity -> enable insurance -> swap -> premium collection
- [ ] Test multiple LPs with insurance in same pool
- [ ] Test premium collection across different pools
- [ ] Test vault reserve accumulation over multiple swaps
- [ ] Test policy lifecycle with premium payments

### Gas Optimization Tests

- [ ] Benchmark afterSwap gas usage with/without premium collection
- [ ] Test batched premium deposits vs individual deposits
- [ ] Compare gas costs across different pool types
- [ ] Measure impact on swap transaction costs

## Error Scenarios & Edge Cases

- [ ] Vault deposit fails during premium collection
- [ ] Pool not whitelisted for insurance
- [ ] Premium calculation overflow/underflow
- [ ] Zero liquidity positions
- [ ] Extremely high fee growth scenarios

## Integration Points

- [ ] Hook -> FeeSplitter -> InsuranceVault premium flow
- [ ] Hook -> PolicyManager for policy lifecycle
- [ ] Frontend premium estimation and display
- [ ] Event indexing for premium tracking

## Definition of Done

- [ ] All premium flow contracts compile and deploy successfully
- [ ] Unit tests achieve ≥85% coverage for new functionality
- [ ] Gas usage is optimized and within reasonable limits
- [ ] Premium collection works correctly across multiple swap scenarios
- [ ] Integration tests pass for complete policy + premium flow
- [ ] No regressions in existing functionality
- [ ] Code is properly documented with NatSpec

## Dependencies

- Phase 2 completion (Policy & Vault implementation)
- Uniswap v4 fee mechanics understanding
- Mock pool setup for testing

## Technical Debt & TODOs

- [ ] Document premium calculation formulas
- [ ] Add governance for premium rate adjustments
- [ ] Consider dynamic premium pricing based on IL risk
- [ ] Plan for premium rebates on low-risk positions

## Estimated Time

3-4 days

## Priority

P0 - Critical Path

# Phase 6: Frontend Polish & Real Transaction Flows

## Epic Overview

Complete the Next.js frontend with real transaction flows, comprehensive UI for policy management and claims, attestation display, and end-to-end user experience polish.

## Acceptance Criteria

- [ ] Complete wallet integration with transaction signing
- [ ] Real transaction flows for policy creation and claims
- [ ] UI displays attestations, signatures, and payout results
- [ ] Responsive design with loading states and error handling
- [ ] Complete claim flow UI from request to settlement
- [ ] Gas optimizations and transaction batching where applicable

## Technical Requirements

### Core UI Components

#### WalletConnect.tsx

- [ ] appkit integration with custom styling
- [ ] Network switching support (local anvil, testnets)
- [ ] Connection state management
- [ ] Error handling for wallet connection issues
- [ ] Support for multiple wallet types

#### Enhanced PolicyCard.tsx

- [ ] Real-time policy status updates
- [ ] Premium payment history
- [ ] Policy terms display (cap, deductible, duration)
- [ ] Entry commitment hash display
- [ ] Policy NFT metadata rendering
- [ ] Action buttons: claim, extend, cancel

#### Complete ClaimFlow.tsx

```typescript
interface ClaimFlowProps {
  policyId: number;
  onClaimComplete: (result: ClaimResult) => void;
}
```

- [ ] Step 1: Initiate claim (beforeRemoveLiquidity transaction)
- [ ] Step 2: Show attestation processing status
- [ ] Step 3: Display fhenix computation result
- [ ] Step 4: Show AVS signature aggregation
- [ ] Step 5: Execute final payout transaction
- [ ] Progress indicators and error states for each step

#### VaultStats.tsx

- [ ] Real-time TVL from blockchain data
- [ ] Reserve ratios per pool
- [ ] Recent payouts table
- [ ] Historical premium collection charts
- [ ] Vault health indicators
- [ ] Admin controls (if wallet is owner)

### Page Implementations

#### `/dashboard` - LP Dashboard

- [ ] Connected wallet position overview
- [ ] Active policies grid with PolicyCard components
- [ ] Total premiums paid and potential payouts
- [ ] Quick actions: add insurance, claim, view policy details
- [ ] Transaction history with etherscan links
- [ ] Filter and search functionality

#### `/policy/[id]` - Policy Detail

- [ ] Complete policy information display
- [ ] Premium payment history with transaction hashes
- [ ] IL risk analysis and current exposure
- [ ] Claim history and status
- [ ] Policy document download (metadata)
- [ ] Share policy link functionality

#### `/vault` - Vault Analytics

- [ ] Public vault statistics and health metrics
- [ ] Premium collection charts over time
- [ ] Payout distribution analysis
- [ ] Pool-specific reserve ratios
- [ ] Recent activity feed
- [ ] Governance proposals (if applicable)

### Real Transaction Integration

#### Policy Creation Flow

```typescript
async function createInsuredPosition(params: {
  pool: string;
  amount0: string;
  amount1: string;
  insuranceEnabled: boolean;
  policyParams: PolicyParams;
});
```

- [ ] Estimate gas for combined LP + insurance transaction
- [ ] Handle approval transactions for tokens
- [ ] Execute addLiquidity with insurance flag
- [ ] Wait for policy NFT minting confirmation
- [ ] Update UI with new policy information

#### Claim Processing

```typescript
async function processClaim(policyId: number): Promise<ClaimResult>;
```

- [ ] Execute beforeRemoveLiquidity transaction
- [ ] Monitor ClaimRequested event emission
- [ ] Poll indexer for fhenix computation status
- [ ] Display attestation and signature data
- [ ] Execute final payout transaction when ready
- [ ] Handle claim rejection scenarios

### Advanced UI Features

#### Transaction Monitoring

- [ ] Real-time transaction status tracking
- [ ] Gas price optimization suggestions
- [ ] Transaction replacement (speed up/cancel)
- [ ] Multiple transaction batching UI
- [ ] Confirmation requirements display
- [ ] Error parsing and user-friendly messages

#### Data Visualization

- [ ] IL exposure charts for active positions
- [ ] Premium vs. payout projection graphs
- [ ] Historical vault performance metrics
- [ ] Pool volatility indicators
- [ ] Risk assessment visualizations

#### Responsive Design

- [ ] Mobile-first approach with Tailwind CSS
- [ ] Tablet and desktop breakpoints
- [ ] Touch-friendly interaction elements
- [ ] Progressive Web App (PWA) capabilities
- [ ] Dark/light theme support
- [ ] Accessibility compliance (WCAG 2.1)

## Smart Contract Integration

### Enhanced Contract Helpers (`lib/contracts.ts`)

```typescript
export const useConfidentialILHook = () => {
  // Contract instance with proper typing
  // Transaction building helpers
  // Event listening hooks
  // Error handling utilities
};
```

### Event Processing (`lib/events.ts`)

- [ ] Real-time event listening with WebSocket RPC
- [ ] Event parsing and type safety
- [ ] Historical event querying
- [ ] Event-based UI updates
- [ ] Pagination for event lists

### Gas Optimization

- [ ] Multicall integration for batched operations
- [ ] Gas estimation with safety margins
- [ ] Dynamic gas price adjustment
- [ ] Transaction queuing and batching
- [ ] Gas token integration (if applicable)

## Testing Requirements

### Component Tests

- [ ] Unit tests for all React components
- [ ] Mock contract interactions
- [ ] User interaction testing (click, form submission)
- [ ] Error state testing
- [ ] Loading state verification

### Integration Tests

- [ ] End-to-end user flows with Playwright/Cypress
- [ ] Wallet connection and transaction signing
- [ ] Multi-step claim process testing
- [ ] Cross-browser compatibility
- [ ] Mobile device testing

### Performance Tests

- [ ] Page load time optimization
- [ ] Large data set rendering (many policies)
- [ ] Real-time update performance
- [ ] Memory leak prevention
- [ ] Bundle size optimization

## User Experience Enhancements

### Loading & Error States

- [ ] Skeleton screens during data loading
- [ ] Progressive data loading for large lists
- [ ] Graceful error messages with recovery actions
- [ ] Offline detection and handling
- [ ] Network reconnection logic

### Notifications & Feedback

- [ ] Toast notifications for transaction status
- [ ] Email/push notification setup (optional)
- [ ] In-app notification center
- [ ] Success animations and confirmations
- [ ] Sound feedback for important actions

## Definition of Done

- [ ] All major user flows work end-to-end on local anvil network
- [ ] Real transactions can be signed and broadcasted
- [ ] UI properly displays all attestation and payout data
- [ ] Responsive design works across all device sizes
- [ ] Error handling provides clear user guidance
- [ ] Loading states prevent user confusion
- [ ] Code coverage ≥80% for frontend components
- [ ] Performance benchmarks meet targets (<3s page load)

## Integration Points

- [ ] Frontend ↔ Smart Contracts (ethers.js)
- [ ] Frontend ↔ Indexer (REST API)
- [ ] Frontend ↔ Fhenix Service (status polling)
- [ ] Frontend ↔ Wallet (transaction signing)

## Dependencies

- Phase 5 completion (AVS & Attestation)
- RainbowKit + Wagmi v2
- ShadCN UI components
- Chart.js or similar for data visualization
- React Hook Form for form handling

## Technical Debt & TODOs

- [ ] Add comprehensive error boundary implementation
- [ ] Implement proper state management (Zustand/Redux)
- [ ] Add internationalization (i18n) support
- [ ] Implement comprehensive logging and analytics
- [ ] Add comprehensive accessibility features

## Estimated Time

4-5 days

## Priority

P0 - Critical for Demo

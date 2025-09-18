# End-to-End Demo Testing Checklist

## Prerequisites Setup

- [ ] Browser wallet (MetaMask/WalletConnect) installed and connected
- [ ] Frontend running at http://localhost:3000
- [ ] Fhenix service running at http://localhost:3001
- [ ] Test network configured in wallet (or local hardhat/anvil)

## Visual Testing Checklist

### 1. Landing Page & Navigation

- [ ] **Homepage loads correctly**

  - Navigate to http://localhost:3000
  - Verify hero section displays with stats: "Total Value Protected", "Active Policies", "Claims Paid", "Vault APY"
  - Features section shows: "Automated Protection", "Confidential Terms", "EigenLayer Security", "Yield Optimization"
  - Two main action buttons visible: "Start Protecting" and "Become a Provider"

- [ ] **Navigation works**
  - Click "Start Protecting" button → Should go to `/dashboard`
  - Click "Become a Provider" → Should go to `/vault`
  - Verify no console errors (F12 → Console tab)

### 2. Dashboard Access & Wallet Connection

- [ ] **Dashboard loads**

  - Navigate to http://localhost:3000/dashboard
  - Should see 4 tabs: "Overview", "Get Insurance", "My Policies", "Vault"
  - Wallet connection component appears if not connected

- [ ] **Wallet connection works**
  - Click "Connect Wallet" button (if shown)
  - Wallet popup appears and connect successfully
  - Wallet address displays in UI
  - Dashboard content loads after connection

### 3. Policy Creation Flow (Get Insurance Tab)

- [ ] **Navigate to Get Insurance tab**

  - Click "Get Insurance" tab in dashboard
  - Premium calculation card loads on left side
  - Insurance benefits card shows on right side

- [ ] **Premium Card functionality**

  - Pool dropdown shows available pools (default: USDC/ETH)
  - Coverage amount input field (ETH)
  - Premium amount input field (ETH)
  - Duration input field (blocks/days)
  - "Create Policy" button present

- [ ] **Create a test policy**

  - Fill in values:
    - Pool: Keep default or select from dropdown
    - Coverage: `1.0` ETH
    - Premium: `0.01` ETH
    - Duration: Keep default
  - Click "Create Policy" button
  - Wallet transaction popup appears
  - Confirm transaction

- [ ] **Policy creation success**
  - "Creating Policy..." loading message appears
  - Transaction confirms on blockchain
  - Success toast notification displays
  - Policy appears in the system

### 4. Policy Management (My Policies Tab)

- [ ] **View created policies**

  - Click "My Policies" tab
  - Created policy appears in PolicyCard format
  - Policy card shows:
    - Policy ID
    - Pool information
    - Coverage amount
    - Premium paid
    - Status: "Active"
    - Action buttons

- [ ] **Real data verification**
  - Policy data should come from actual contract calls (not mock)
  - Entry commitment hash should be consistent
  - Pool data should match real contract state
  - Refresh page - data should persist and remain consistent

### 5. Claim Flow Process

- [ ] **Initiate claim**

  - On policy card, click "Request Claim" or similar button
  - ClaimFlow component opens below
  - Shows policy details and claim initiation form

- [ ] **Claim steps progression**

  - Step 1: "Initiate Claim" - Submit beforeRemoveLiquidity transaction
  - Step 2: "Transaction Confirming" - Wait for blockchain confirmation
  - Step 3: "Fhenix Computation" - FHE calculation of IL payout
  - Step 4: "AVS Signature Aggregation" - EigenLayer validation
  - Step 5: "Settlement Transaction" - Final payout execution
  - Step 6: "Claim Completed" - Success confirmation

- [ ] **Progress indicators**
  - Progress bar shows current step
  - Step icons change state (pending → active → completed)
  - Estimated time for each step displays
  - Loading animations during processing

### 6. Fhenix Service Integration

- [ ] **Computation phase**

  - During "Fhenix Computation" step, verify:
    - Loading indicator shows
    - API call to http://localhost:3001/api/compute-claim
    - Returns attestation data:
      - Policy ID
      - Payout amount
      - Audit hash (64-char hex)
      - Fhenix signature (130-char hex)
      - Worker ID

- [ ] **Attestation display**
  - Fhenix computation results display in UI
  - All attestation fields visible and formatted correctly
  - Data persists on page refresh (if applicable)

### 7. AVS Verification & Settlement

- [ ] **Settlement transaction**

  - After Fhenix computation, settlement step initiates
  - Wallet transaction for final payout appears
  - Confirm transaction in wallet

- [ ] **Payout completion**
  - Transaction confirms on blockchain
  - Claim status updates to "Completed"
  - Success notification displays
  - If payout > 0: Wallet balance increases

### 8. Vault Dashboard (Vault Tab)

- [ ] **Vault statistics**

  - Click "Vault" tab
  - VaultDashboard component loads
  - Shows real vault statistics:
    - Total reserves
    - Active policies count
    - Total payouts
    - Utilization rate
    - Recent activity

- [ ] **Vault interactions**
  - Deposit functionality available
  - Withdraw functionality available
  - Transaction flows work with wallet

### 9. Overview Tab Analytics

- [ ] **Dashboard overview**
  - Click "Overview" tab
  - Real-time vault dashboard displays
  - Enhanced vault stats with charts/graphs
  - Quick action buttons work
  - All metrics display real data (not mock numbers)

### 10. Complete End-to-End Demo Flow

- [ ] **Full workflow test**
  1. Start at homepage → Click "Start Protecting"
  2. Connect wallet → Dashboard loads
  3. "Get Insurance" tab → Create policy with real values
  4. Policy appears in "My Policies" tab
  5. Initiate claim → ClaimFlow progresses through all steps
  6. Fhenix computation returns attestation
  7. AVS verification completes
  8. Settlement transaction executes
  9. Final payout (if any) processes successfully

### 11. Data Integration Verification

- [ ] **Real contract data throughout**
  - No Math.random() or mock data visible
  - Policy commitments from actual contract storage
  - Pool data from real contract state
  - Vault statistics from live contract calls
  - Transaction hashes are real and verifiable

### 12. Error Handling & Polish

- [ ] **Error states**

  - Network disconnection handling
  - Transaction rejection handling
  - Invalid input validation
  - Service downtime graceful degradation

- [ ] **UI quality**
  - Professional styling with dark theme
  - Animations and transitions smooth
  - Loading states clear and informative
  - Success/error toasts appear appropriately
  - Mobile responsive (test different screen sizes)

## Testing Notes

Please record any issues found:

**Policy Creation Issues:**

- [ ] None found / List any problems

**Claim Flow Issues:**

- [ ] None found / List any problems

**Fhenix Service Issues:**

- [ ] None found / List any problems

**UI/UX Issues:**

- [ ] None found / List any problems

**Data Integration Issues:**

- [ ] None found / List any problems

## Expected Demo Flow Summary

1. **LP Position**: User creates insured policy → commitment stored on-chain
2. **Price Movement**: (Simulated via UI or natural market movement)
3. **IL Claim**: User initiates claim → exit commitment generated
4. **Fhenix Computation**: Service computes IL and returns attestation
5. **AVS Verification**: Smart contract verifies attestation
6. **Payout**: Funds transferred to user wallet
7. **Complete**: Full flow demonstrable via frontend

## Success Criteria

- [ ] All 6 demo flow steps work end-to-end
- [ ] Real contract data used throughout (no mock data)
- [ ] Frontend provides smooth user experience
- [ ] Fhenix attestation system functions correctly
- [ ] Smart contract integration works properly
- [ ] Demo is presentation-ready

---

**After completing this checklist, please report back with:**

1. Which items passed ✅
2. Which items failed ❌
3. Any specific error messages or unexpected behavior
4. Screenshots of key screens (if possible)
5. Overall assessment of demo readiness

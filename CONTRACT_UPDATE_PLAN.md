# Contract Deployment and Frontend Update Plan

## Issue Identified

The frontend was using outdated contract ABIs and function signatures that didn't match the current smart contract implementations after EigenLayer and Fhenix integration.

## Actions Taken

### 1. Fixed Frontend ABI ✅

- Updated `POLICY_MANAGER_ABI` in `frontend/lib/contracts.ts`
- Fixed `mintPolicy` function signature to match actual contract:
  ```solidity
  mintPolicy(address recipient, address pool, uint256 coverage, uint256 premium, bytes32 commitment)
  ```

### 2. Updated Transaction Functions ✅

- Fixed `mintPolicy` call in `frontend/lib/transactions.ts`
- Updated `handleCreatePolicy` in `DashboardIntegration.tsx`

### 3. Created Deployment Infrastructure ✅

- Created `script/DeployUpdatedContracts.s.sol` for comprehensive deployment
- Created `extract-abis.sh` for ABI extraction
- Extracted current ABIs to `frontend/lib/abi/` directory

## Next Steps Required

### Option A: Test with Current Contracts (Quick Fix)

The insurance creation should now work with the current deployed contracts since we've fixed the ABI mismatch.

**Test this first:**

1. Try creating an insurance policy in the frontend
2. Check if the transaction succeeds

### Option B: Full Redeployment (Comprehensive Fix)

If you want the latest contract implementations with all EigenLayer/Fhenix improvements:

1. **Set up deployment environment:**

   ```bash
   export SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
   export PRIVATE_KEY="your_private_key_here"
   ```

2. **Deploy updated contracts:**

   ```bash
   forge script script/DeployUpdatedContracts.s.sol \
     --rpc-url $SEPOLIA_RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --verify
   ```

3. **Update environment variables:**
   Update `frontend/.env.local` with new contract addresses from deployment output

4. **Update frontend ABIs:**
   Replace the manual ABI definitions in `frontend/lib/contracts.ts` with imports from the extracted JSON files:
   ```typescript
   import POLICY_MANAGER_ABI from "./abi/PolicyManager.json";
   import INSURANCE_VAULT_ABI from "./abi/InsuranceVault.json";
   // etc...
   ```

## Contract Changes Summary

### PolicyManager

- ✅ Simplified `mintPolicy` interface
- ✅ Removed complex policy parameter tuples
- ✅ Direct coverage/premium parameters

### InsuranceVault

- ✅ EigenLayer AVS integration
- ✅ Enhanced role management
- ✅ Improved payout mechanisms

### ConfidentialILHook

- ✅ Full Uniswap V4 hook implementation
- ✅ Real-time premium collection
- ✅ Claim initiation via `beforeRemoveLiquidity`

### EigenAVSManagerV2

- ✅ BLS signature aggregation
- ✅ Task management system
- ✅ Fhenix attestation verification

### FhenixComputeProxy

- ✅ Attestation validation
- ✅ Secure computation verification
- ✅ Worker management

## Recommended Approach

1. **Try Option A first** - test the current fix
2. **If issues persist or you want latest features**, proceed with Option B
3. **For production deployment**, definitely use Option B with proper contract verification

## Files Modified

- ✅ `frontend/lib/contracts.ts` - Updated ABI
- ✅ `frontend/lib/transactions.ts` - Fixed function calls
- ✅ `frontend/components/DashboardIntegration.tsx` - Fixed parameters
- ✅ `script/DeployUpdatedContracts.s.sol` - Deployment script
- ✅ `extract-abis.sh` - ABI extraction utility

The frontend should now work correctly with the current deployed contracts. Test the insurance creation flow and let me know if you encounter any other issues!

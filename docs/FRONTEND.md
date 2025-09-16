# Frontend Documentation

## Overview

The frontend application is built with Next.js 14, TypeScript, and modern React patterns. It provides a comprehensive dashboard for interacting with the Confidential Impermanent Loss Insurance system.

## Architecture

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Blockchain**: wagmi + viem for Ethereum interactions
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Testing**: Jest + React Testing Library

### Project Structure

```
frontend/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page
│   ├── dashboard/               # Dashboard pages
│   │   └── page.tsx            # Main dashboard
│   ├── policy/                  # Policy management
│   │   └── [id]/               # Dynamic policy details
│   │       ├── page.tsx        # Policy detail page
│   │       └── PolicyDetailView.tsx # Policy detail component
│   └── vault/                   # Vault management
│       ├── page.tsx            # Vault overview
│       └── VaultManagement.tsx # Vault management component
├── components/                  # Reusable UI components
│   ├── ui/                     # shadcn/ui base components
│   ├── DashboardIntegration.tsx # Main dashboard
│   ├── PolicyCard.tsx          # Policy display component
│   ├── VaultStats.tsx          # Vault statistics
│   ├── ClaimFlow.tsx           # Claim submission flow
│   ├── TransactionMonitor.tsx  # Transaction tracking
│   └── WalletConnection.tsx    # Wallet integration
├── lib/                        # Utilities and configurations
│   ├── contracts.ts            # Contract ABIs and addresses
│   ├── transactions.ts         # Transaction hooks
│   ├── events.ts              # Event monitoring
│   ├── store.ts               # Global state management
│   ├── wagmi.ts               # wagmi configuration
│   └── utils.ts               # Utility functions
└── hooks/                      # Custom React hooks
    └── use-toast.ts           # Toast notifications
```

## Core Components

### 1. DashboardIntegration.tsx

**Location**: `frontend/components/DashboardIntegration.tsx`

#### Purpose

The main dashboard component that integrates all IL insurance functionality into a single, comprehensive interface.

#### Key Features

- Real-time policy monitoring
- Premium payment interface
- Claim submission workflow
- Vault management controls
- Transaction status tracking
- Multi-tab organization

#### Component Structure

```typescript
interface DashboardIntegrationProps {
  selectedPool?: string;
  onPoolSelect?: (poolAddress: string) => void;
}

export default function DashboardIntegration({ selectedPool, onPoolSelect }: DashboardIntegrationProps) {
  // Hooks and state management
  const { address } = useAccount();
  const { userPolicies, vaultStats, isLoading } = useAppStore();

  // Transaction hooks
  const { mintPolicy, submitClaim, mintState, claimState } = usePolicyTransactions();
  const { deposit, withdraw, depositState, withdrawState } = useVaultTransactions();

  // Component logic...
}
```

#### Key Functions

##### handlePolicyMint

```typescript
const handlePolicyMint = async (poolAddress: string, params: PolicyParams) => {
  if (!address) {
    toast.error("Please connect your wallet");
    return;
  }

  try {
    const txHash = await mintPolicy(address, poolAddress as Address, params, generateCommitment(address, Date.now()));

    toast.success(`Policy creation initiated: ${txHash}`);
  } catch (error) {
    console.error("Policy minting failed:", error);
    toast.error("Failed to create policy");
  }
};
```

##### handleClaimSubmission

```typescript
const handleClaimSubmission = async (policyId: string, claimAmount: string) => {
  if (!address) {
    toast.error("Please connect your wallet");
    return;
  }

  try {
    const amount = BigInt(Math.floor(parseFloat(claimAmount) * 1e18));
    const merkleProof = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;

    await submitClaim(BigInt(policyId), amount, merkleProof);
    toast.success("Claim submitted successfully");
  } catch (error) {
    console.error("Claim submission failed:", error);
    toast.error("Failed to submit claim");
  }
};
```

##### handleVaultDeposit

```typescript
const handleVaultDeposit = async (amount: string) => {
  if (!address) {
    toast.error("Please connect your wallet");
    return;
  }

  try {
    const depositAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));
    await deposit(depositAmount, address);
    toast.success("Deposit successful");
  } catch (error) {
    console.error("Vault deposit failed:", error);
    toast.error("Failed to deposit to vault");
  }
};
```

#### UI Structure

The dashboard is organized into tabs:

1. **Overview**: Summary statistics and key metrics
2. **Policies**: Policy management and monitoring
3. **Claims**: Claim submission and tracking
4. **Vault**: Vault operations and statistics
5. **Analytics**: Performance analytics and insights

---

### 2. PolicyCard.tsx

**Location**: `frontend/components/PolicyCard.tsx`

#### Purpose

Displays individual policy information with rich visual indicators and interactive controls.

#### Features

- Policy status visualization with color-coded badges
- Risk level indicators
- Time remaining calculations with progress bars
- Real-time event monitoring
- Action buttons for claim requests and policy management
- Compact and full view modes

#### Props Interface

```typescript
interface PolicyCardProps {
  policy: PolicyState;
  onClaimRequest?: (policyId: string) => void;
  onBurnPolicy?: (policyId: string) => void;
  onViewDetails?: (policyId: string) => void;
  isLoading?: boolean;
  compact?: boolean;
  showActions?: boolean;
}
```

#### Policy State Interface

```typescript
interface PolicyState extends Policy {
  id: string;
  premiumsPaid: bigint;
  estimatedPayout?: bigint;
  riskLevel: "low" | "medium" | "high";
  status: "active" | "claimed" | "attested" | "settled" | "expired";
  lastUpdated: number;
}
```

#### Key Functions

##### formatAmount

```typescript
const formatAmount = (amount: bigint, decimals = 18) => {
  const value = Number(amount) / Math.pow(10, decimals);
  return value < 0.0001 ? "< 0.0001" : value.toFixed(4);
};
```

##### timeRemaining

```typescript
const timeRemaining = () => {
  const expiryTime = Number(policy.createdAt) + Number(policy.params.duration) * 12 * 1000;
  const now = Date.now();

  if (now > expiryTime) return null;
  return formatDistanceToNow(expiryTime, { addSuffix: true });
};
```

##### progressPercentage

```typescript
const progressPercentage = () => {
  const now = Date.now();
  const start = Number(policy.createdAt);
  const end = start + Number(policy.params.duration) * 12 * 1000;

  if (now >= end) return 100;
  if (now <= start) return 0;

  return ((now - start) / (end - start)) * 100;
};
```

#### Visual Elements

##### Status Badge

```typescript
const getStatusBadge = () => {
  const statusConfig = {
    active: { color: "bg-green-600", icon: Shield, text: "Active" },
    claimed: { color: "bg-blue-600", icon: Clock, text: "Claimed" },
    attested: { color: "bg-purple-600", icon: Activity, text: "Attested" },
    settled: { color: "bg-gray-600", icon: Target, text: "Settled" },
    expired: { color: "bg-orange-600", icon: AlertTriangle, text: "Expired" },
  };

  const config = statusConfig[policy.status];
  const Icon = config.icon;

  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    </motion.div>
  );
};
```

##### Risk Indicator

```typescript
const getRiskIndicator = () => {
  const colors = {
    low: "text-green-400 border-green-500/30",
    medium: "text-yellow-400 border-yellow-500/30",
    high: "text-red-400 border-red-500/30",
  };

  return (
    <Badge variant="outline" className={colors[policy.riskLevel]}>
      {policy.riskLevel} risk
    </Badge>
  );
};
```

---

### 3. ClaimFlow.tsx

**Location**: `frontend/components/ClaimFlow.tsx`

#### Purpose

Handles the multi-step claim submission process with validation and user guidance.

#### Flow Steps

1. **Policy Validation**: Verify policy eligibility
2. **IL Assessment**: Calculate current impermanent loss
3. **Proof Generation**: Generate required proofs
4. **Claim Submission**: Submit claim to smart contract
5. **Verification Tracking**: Monitor claim verification process
6. **Payout Execution**: Track payout distribution

#### Component Structure

```typescript
interface ClaimFlowProps {
  policyId: string;
  onComplete?: (claimId: string) => void;
  onCancel?: () => void;
}

enum ClaimStep {
  VALIDATION = "validation",
  ASSESSMENT = "assessment",
  PROOF_GENERATION = "proof_generation",
  SUBMISSION = "submission",
  VERIFICATION = "verification",
  COMPLETION = "completion",
}

export default function ClaimFlow({ policyId, onComplete, onCancel }: ClaimFlowProps) {
  const [currentStep, setCurrentStep] = useState<ClaimStep>(ClaimStep.VALIDATION);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step-specific logic...
}
```

#### Step Implementations

##### Step 1: Policy Validation

```typescript
const validatePolicy = async () => {
  setIsProcessing(true);

  try {
    const policy = await getPolicyDetails(BigInt(policyId));

    // Check if policy is active
    if (!policy.active) {
      throw new Error("Policy is not active");
    }

    // Check if policy hasn't expired
    const expiryTime = Number(policy.createdAt) + Number(policy.params.duration) * 12 * 1000;
    if (Date.now() > expiryTime) {
      throw new Error("Policy has expired");
    }

    // Check if no existing claim
    const existingClaim = await getClaimDetails(BigInt(policyId));
    if (existingClaim.status !== 0) {
      throw new Error("Claim already exists for this policy");
    }

    setCurrentStep(ClaimStep.ASSESSMENT);
  } catch (error) {
    toast.error(`Validation failed: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

##### Step 2: IL Assessment

```typescript
const assessImpermanentLoss = async () => {
  setIsProcessing(true);

  try {
    // Request confidential IL calculation
    const calculationResult = await requestILCalculation({
      policyId,
      encryptedPositionData: await encryptPositionData(policy),
      currentPriceData: await getCurrentPriceData(policy.pool),
    });

    setClaimData({
      ...claimData,
      estimatedLoss: calculationResult.estimatedLoss,
      proof: calculationResult.proof,
    });

    setCurrentStep(ClaimStep.PROOF_GENERATION);
  } catch (error) {
    toast.error(`IL assessment failed: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

##### Step 3: Proof Generation

```typescript
const generateProof = async () => {
  setIsProcessing(true);

  try {
    // Generate zero-knowledge proof for claim
    const zkProof = await generateZKProof({
      policyCommitment: policy.entryCommit,
      exitCommitment: generateExitCommitment(),
      impermanentLoss: claimData.estimatedLoss,
    });

    setClaimData({
      ...claimData,
      zkProof,
    });

    setCurrentStep(ClaimStep.SUBMISSION);
  } catch (error) {
    toast.error(`Proof generation failed: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

---

### 4. VaultStats.tsx

**Location**: `frontend/components/VaultStats.tsx`

#### Purpose

Displays comprehensive vault statistics and financial metrics with real-time updates.

#### Key Metrics

- **Total Reserves**: Current vault balance
- **Pool-specific Reserves**: Reserves allocated per pool
- **Solvency Ratios**: Reserve-to-liability ratios
- **Premium Collection**: Historical premium data
- **Claim Payouts**: Payout history and statistics
- **Performance Metrics**: Vault efficiency indicators

#### Component Structure

```typescript
interface VaultStatsProps {
  selectedPool?: string;
  timeRange?: "24h" | "7d" | "30d" | "90d";
}

export default function VaultStats({ selectedPool, timeRange = "24h" }: VaultStatsProps) {
  const [stats, setStats] = useState<VaultStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time stats fetching
  const { data: vaultData } = useInsuranceVault();

  // Component logic...
}
```

#### Key Functions

##### fetchVaultStats

```typescript
const fetchVaultStats = useCallback(async () => {
  setIsLoading(true);

  try {
    if (selectedPool) {
      // Pool-specific stats
      const poolStats = await getVaultStats(selectedPool as Address);
      setStats({
        totalReserves: poolStats.totalReserves,
        totalPremiums: poolStats.totalPremiums,
        totalClaims: poolStats.totalClaims,
        reserveRatio: poolStats.reserveRatio,
        // Additional calculated metrics
      });
    } else {
      // Global vault stats
      const globalStats = await getGlobalVaultStats();
      setStats(globalStats);
    }
  } catch (error) {
    console.error("Failed to fetch vault stats:", error);
  } finally {
    setIsLoading(false);
  }
}, [selectedPool]);
```

##### calculateSolvencyRatio

```typescript
const calculateSolvencyRatio = (reserves: bigint, liabilities: bigint): number => {
  if (liabilities === 0n) return 100;
  return Number((reserves * 10000n) / liabilities) / 100;
};
```

#### Visual Components

##### Metric Card

```typescript
const MetricCard = ({ title, value, change, icon: Icon, trend }: MetricCardProps) => (
  <Card className="bg-black/60 border-green-500/30">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-green-400">{value}</p>
          {change && (
            <p className={`text-sm ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
              {trend === "up" ? "↗" : "↘"} {change}
            </p>
          )}
        </div>
        <Icon className="h-8 w-8 text-green-400" />
      </div>
    </CardContent>
  </Card>
);
```

---

### 5. TransactionMonitor.tsx

**Location**: `frontend/components/TransactionMonitor.tsx`

#### Purpose

Provides real-time monitoring and management of blockchain transactions with detailed status tracking.

#### Features

- **Real-time Status Updates**: Live transaction status monitoring
- **Gas Estimation**: Accurate gas cost predictions
- **Error Handling**: Comprehensive error reporting and retry mechanisms
- **Transaction History**: Complete transaction log with filtering
- **Notification System**: Toast notifications for status changes

#### Transaction States

```typescript
interface Transaction {
  id: string;
  hash?: string;
  status: "idle" | "pending" | "success" | "error";
  type: "mint-policy" | "claim" | "deposit-premium" | "attestation";
  description: string;
  timestamp: number;
  error?: string;
  receipt?: any;
  blockNumber?: bigint;
  gasUsed?: bigint;
}
```

#### Key Functions

##### monitorTransaction

```typescript
const monitorTransaction = useCallback(
  async (txHash: Hash) => {
    const transaction = transactions.find(tx => tx.hash === txHash);
    if (!transaction) return;

    try {
      // Wait for transaction receipt
      const receipt = await waitForTransaction({ hash: txHash });

      if (receipt.status === "success") {
        updateTransaction(transaction.id, {
          status: "success",
          receipt,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
        });

        toast.success(`Transaction confirmed: ${transaction.description}`);
      } else {
        updateTransaction(transaction.id, {
          status: "error",
          error: "Transaction reverted",
        });

        toast.error(`Transaction failed: ${transaction.description}`);
      }
    } catch (error) {
      updateTransaction(transaction.id, {
        status: "error",
        error: error.message,
      });

      toast.error(`Transaction error: ${error.message}`);
    }
  },
  [transactions, updateTransaction]
);
```

---

## State Management

### Global Store (Zustand)

**Location**: `frontend/lib/store.ts`

#### Store Structure

```typescript
interface AppState {
  // User data
  userAddress?: string;
  userPolicies: PolicyState[];
  userTransactions: Transaction[];

  // Vault data
  vaultStats: VaultStats;

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedPool?: string;

  // Actions
  addPolicy: (policy: PolicyState) => void;
  updatePolicy: (id: string, updates: Partial<PolicyState>) => void;
  removePolicy: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  setVaultStats: (stats: VaultStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedPool: (pool: string) => void;

  // Computed values
  activePolicies: PolicyState[];
  totalPremiumsPaid: bigint;
  pendingClaims: PolicyState[];
}
```

#### Store Implementation

```typescript
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        userPolicies: [],
        userTransactions: [],
        vaultStats: {
          totalReserves: 0n,
          poolReserves: {},
          totalPolicies: 0,
          totalPayouts: 0n,
          averagePremium: 0n,
          solvencyRatio: 0,
          lastUpdated: 0,
        },
        isLoading: false,
        error: null,

        // Actions
        addPolicy: policy =>
          set(state => ({
            userPolicies: [...state.userPolicies, policy],
          })),

        updatePolicy: (id, updates) =>
          set(state => ({
            userPolicies: state.userPolicies.map(policy => (policy.id === id ? { ...policy, ...updates } : policy)),
          })),

        // Computed selectors
        get activePolicies() {
          return get().userPolicies.filter(policy => policy.active);
        },

        get totalPremiumsPaid() {
          return get().userPolicies.reduce((total, policy) => total + policy.premiumsPaid, 0n);
        },

        get pendingClaims() {
          return get().userPolicies.filter(policy => policy.status === "claimed" || policy.status === "attested");
        },
      }),
      {
        name: "il-insurance-store",
        partialize: state => ({
          userPolicies: state.userPolicies,
          userTransactions: state.userTransactions,
          selectedPool: state.selectedPool,
        }),
      }
    )
  )
);
```

---

## Blockchain Integration

### Contract Integration

**Location**: `frontend/lib/contracts.ts`

#### ABI Definitions

The contracts file exports all necessary ABIs and addresses:

```typescript
export const POLICY_MANAGER_ABI = [
  // Policy management functions
  {
    type: "function",
    name: "mintPolicy",
    inputs: [
      { name: "lp", type: "address" },
      { name: "pool", type: "address" },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "deductibleBps", type: "uint256" },
          { name: "capBps", type: "uint256" },
          { name: "premiumBps", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "pool", type: "address" },
        ],
      },
      { name: "entryCommit", type: "bytes32" },
    ],
    outputs: [{ name: "policyId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  // ... more function definitions
] as const;
```

#### Contract Addresses

```typescript
export const CONTRACT_ADDRESSES = {
  HOOK: process.env.NEXT_PUBLIC_HOOK_ADDRESS as Address,
  POLICY_MANAGER: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
  INSURANCE_VAULT: process.env.NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS as Address,
  PAYOUT_VAULT: process.env.NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS as Address,
  EIGEN_AVS_MANAGER: process.env.NEXT_PUBLIC_EIGEN_AVS_MANAGER_ADDRESS as Address,
  FHENIX_COMPUTE_PROXY: process.env.NEXT_PUBLIC_FHENIX_COMPUTE_PROXY_ADDRESS as Address,
  FEE_SPLITTER: process.env.NEXT_PUBLIC_FEE_SPLITTER_ADDRESS as Address,
} as const;
```

#### Type Definitions

```typescript
export type PolicyParams = {
  deductibleBps: bigint;
  capBps: bigint;
  premiumBps: bigint;
  duration: bigint;
  pool: Address;
};

export type Policy = {
  lp: Address;
  pool: Address;
  params: PolicyParams;
  entryCommit: `0x${string}`;
  createdAt: bigint;
  epoch: bigint;
  active: boolean;
};

export type ClaimData = {
  status: number;
  requestTimestamp: bigint;
  policyId: bigint;
  exitCommit: `0x${string}`;
  claimer: Address;
  requestedAmount: bigint;
};
```

### Transaction Hooks

**Location**: `frontend/lib/transactions.ts`

#### Policy Management Hooks

```typescript
export function usePolicyTransactions() {
  const { writeContractAsync } = useWriteContract();
  const { addTransaction, updateTransaction } = useAppStore();

  const mintPolicy = useCallback(
    async (lp: Address, pool: Address, params: PolicyParams, entryCommit: Hash) => {
      const transactionId = generateTransactionId();

      addTransaction({
        id: transactionId,
        status: "pending",
        type: "mint-policy",
        description: "Creating insurance policy",
        timestamp: Date.now(),
      });

      try {
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.POLICY_MANAGER,
          abi: POLICY_MANAGER_ABI,
          functionName: "mintPolicy",
          args: [lp, pool, params, entryCommit],
        });

        updateTransaction(transactionId, { hash, status: "pending" });
        return hash;
      } catch (error) {
        updateTransaction(transactionId, {
          status: "error",
          error: error.message,
        });
        throw error;
      }
    },
    [writeContractAsync, addTransaction, updateTransaction]
  );

  const submitClaim = useCallback(
    async (policyId: bigint, amount: bigint, merkleProof: Hash) => {
      // Similar implementation for claim submission
      // ...
    },
    [writeContractAsync, addTransaction, updateTransaction]
  );

  return {
    mintPolicy,
    submitClaim,
    // ... other functions
  };
}
```

#### Vault Transaction Hooks

```typescript
export function useVaultTransactions() {
  const { writeContractAsync } = useWriteContract();

  const deposit = useCallback(
    async (amount: bigint, recipient: Address) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.PAYOUT_VAULT,
        abi: PAYOUT_VAULT_ABI,
        functionName: "deposit",
        args: [amount],
        value: amount,
      });
    },
    [writeContractAsync]
  );

  const withdraw = useCallback(
    async (amount: bigint, recipient: Address) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.PAYOUT_VAULT,
        abi: PAYOUT_VAULT_ABI,
        functionName: "withdraw",
        args: [recipient, amount],
      });
    },
    [writeContractAsync]
  );

  return { deposit, withdraw };
}
```

### Event Monitoring

**Location**: `frontend/lib/events.ts`

#### Real-time Event Monitoring

```typescript
export function usePolicyEvents(policyId: bigint) {
  // Monitor PolicyCreated events
  const created = useWatchContractEvent({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    eventName: "PolicyCreated",
    args: { policyId },
    onLogs: logs => {
      console.log("Policy created:", logs);
      // Update local state
    },
  });

  // Monitor ClaimRequested events
  const claimRequested = useWatchContractEvent({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    eventName: "ClaimRequested",
    args: { policyId },
    onLogs: logs => {
      console.log("Claim requested:", logs);
      // Trigger UI updates
    },
  });

  // Monitor ClaimSettled events
  const claimSettled = useWatchContractEvent({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    eventName: "ClaimSettled",
    args: { policyId },
    onLogs: logs => {
      console.log("Claim settled:", logs);
      // Update policy status
    },
  });

  return {
    created,
    claimRequested,
    claimSettled,
  };
}
```

#### Global Event Monitoring

```typescript
export function useGlobalEvents() {
  const { addTransaction, updateTransaction } = useAppStore();

  // Monitor all policy creation events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    eventName: "PolicyCreated",
    onLogs: logs => {
      logs.forEach(log => {
        // Process policy creation events
        const { policyId, lp, pool, params } = log.args;

        // Add to store if it's user's policy
        if (lp === userAddress) {
          addPolicy({
            id: policyId.toString(),
            lp,
            pool,
            params,
            status: "active",
            // ... other properties
          });
        }
      });
    },
  });

  // Monitor vault deposits
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.INSURANCE_VAULT,
    abi: INSURANCE_VAULT_ABI,
    eventName: "PremiumDeposited",
    onLogs: logs => {
      // Update vault statistics
    },
  });
}
```

---

## Utility Functions

### Formatting Utilities

**Location**: `frontend/lib/utils.ts`

```typescript
// Format ETH amounts
export function formatEther(wei: bigint, decimals: number = 4): string {
  const value = Number(wei) / Math.pow(10, 18);
  if (value < 0.0001) return "< 0.0001";
  return value.toFixed(decimals);
}

// Format percentage from basis points
export function formatPercent(bps: number): string {
  return (bps / 100).toFixed(1) + "%";
}

// Format addresses for display
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format timestamps
export function formatTimestamp(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy HH:mm");
}

// Calculate time remaining
export function getTimeRemaining(endTime: number): string | null {
  const now = Date.now();
  if (now > endTime) return null;
  return formatDistanceToNow(endTime, { addSuffix: true });
}
```

### Validation Utilities

```typescript
// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate amount input
export function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

// Validate basis points
export function isValidBasisPoints(bps: number): boolean {
  return bps >= 0 && bps <= 10000;
}
```

### Crypto Utilities

```typescript
// Generate commitment for policy
export function generateCommitment(address: string, timestamp: number): Hash {
  return keccak256(encodePacked(["address", "uint256"], [address as Address, BigInt(timestamp)]));
}

// Encrypt position data for FHE
export async function encryptPositionData(policy: Policy): Promise<string> {
  // Implementation depends on Fhenix SDK
  // This is a placeholder for the actual encryption logic
  return "encrypted_data";
}
```

---

## Testing

### Component Testing

**Location**: `frontend/__tests__/`

#### PolicyCard Test Example

```typescript
import { render, screen } from "@testing-library/react";
import { PolicyCard } from "@/components/PolicyCard";

const mockPolicy: PolicyState = {
  id: "1",
  lp: "0x123...",
  pool: "0x456...",
  params: {
    deductibleBps: 500n,
    capBps: 8000n,
    premiumBps: 100n,
    duration: 7200n,
    pool: "0x456...",
  },
  entryCommit: "0x789...",
  createdAt: 1234567890n,
  epoch: 1n,
  active: true,
  premiumsPaid: 1000000000000000000n, // 1 ETH
  riskLevel: "medium",
  status: "active",
  lastUpdated: Date.now(),
};

describe("PolicyCard", () => {
  it("renders policy information correctly", () => {
    render(<PolicyCard policy={mockPolicy} />);

    expect(screen.getByText("Policy #1")).toBeInTheDocument();
    expect(screen.getByText("medium risk")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("handles claim request", async () => {
    const onClaimRequest = jest.fn();
    render(<PolicyCard policy={mockPolicy} onClaimRequest={onClaimRequest} />);

    const claimButton = screen.getByText("Request Claim");
    fireEvent.click(claimButton);

    expect(onClaimRequest).toHaveBeenCalledWith("1");
  });
});
```

### Integration Testing

```typescript
describe("Policy Lifecycle Integration", () => {
  it("should create and manage a policy end-to-end", async () => {
    // Mock wallet connection
    mockWallet({ address: "0x123..." });

    // Render dashboard
    render(<DashboardIntegration />);

    // Create policy
    const createButton = screen.getByText("Create Policy");
    fireEvent.click(createButton);

    // Fill form
    fireEvent.change(screen.getByLabelText("Deductible (%)"), {
      target: { value: "5" },
    });

    // Submit
    fireEvent.click(screen.getByText("Submit"));

    // Verify policy creation
    await waitFor(() => {
      expect(screen.getByText("Policy #1")).toBeInTheDocument();
    });
  });
});
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const PolicyDetailView = lazy(() => import("./PolicyDetailView"));
const VaultManagement = lazy(() => import("./VaultManagement"));

// Use in router with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <PolicyDetailView policyId={id} />
</Suspense>;
```

### Memoization

```typescript
// Memoize expensive calculations
const memoizedCalculation = useMemo(() => {
  return calculateComplexMetrics(policies, vaultStats);
}, [policies, vaultStats]);

// Memoize callback functions
const handlePolicyUpdate = useCallback(
  (id: string, updates: Partial<PolicyState>) => {
    updatePolicy(id, updates);
  },
  [updatePolicy]
);
```

### Virtual Scrolling

```typescript
// For large lists of policies
import { FixedSizeList as List } from "react-window";

const PolicyList = ({ policies }: { policies: PolicyState[] }) => (
  <List height={600} itemCount={policies.length} itemSize={200} itemData={policies}>
    {({ index, style, data }) => (
      <div style={style}>
        <PolicyCard policy={data[index]} compact />
      </div>
    )}
  </List>
);
```

---

## Security Considerations

### Input Validation

```typescript
// Sanitize all user inputs
const sanitizeAmount = (input: string): string => {
  return input.replace(/[^0-9.]/g, "");
};

// Validate all addresses
const validateAddress = (address: string): boolean => {
  return isAddress(address);
};
```

### Error Handling

```typescript
// Comprehensive error boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary:", error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

### Environment Variables

```typescript
// Validate required environment variables
const requiredEnvVars = [
  "NEXT_PUBLIC_POLICY_MANAGER_ADDRESS",
  "NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS",
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

---

This completes the comprehensive frontend documentation covering all components, hooks, utilities, and integration patterns used in the Confidential Impermanent Loss Insurance frontend application.

# Confidential Impermanent Loss Insurance - Comprehensive Developer Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Smart Contracts](#smart-contracts)
4. [Frontend Application](#frontend-application)
5. [Backend Services](#backend-services)
6. [Libraries and Utilities](#libraries-and-utilities)
7. [Development Setup](#development-setup)
8. [API Reference](#api-reference)
9. [Deployment Guide](#deployment-guide)
10. [Testing Guide](#testing-guide)

---

## Project Overview

### What is Confidential Impermanent Loss Insurance?

This project implements a comprehensive insurance system for Uniswap v4 liquidity providers (LPs) to protect against impermanent loss (IL). The system leverages cutting-edge technologies to provide:

- **Automated Protection**: Seamless integration with Uniswap v4 through custom hooks
- **Confidential Calculations**: Privacy-preserving IL calculations using Fhenix FHE (Fully Homomorphic Encryption)
- **Decentralized Verification**: EigenLayer AVS (Actively Validated Services) for trustless claim validation
- **Real-time Monitoring**: Comprehensive dashboard for policy management and analytics

### Key Features

1. **Trustless Insurance**: No centralized authority controls payouts
2. **Privacy-Preserving**: IL calculations performed confidentially using FHE
3. **Automated Execution**: Smart contracts handle premium collection and payouts
4. **Real-time Analytics**: Live monitoring of policies and risk metrics
5. **Modular Architecture**: Extensible design for future enhancements

### Core Components

- **Smart Contracts**: Solidity contracts deployed on Ethereum (Sepolia testnet)
- **Frontend**: Next.js React application for user interaction
- **Fhenix Service**: Backend service for confidential computations
- **AVS Node**: EigenLayer operator for claim validation
- **Indexer**: Event monitoring and data aggregation service

---

## Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Smart         │    │   Fhenix        │
│   (Next.js)     │◄──►│   Contracts     │◄──►│   Service       │
│                 │    │   (Solidity)    │    │   (FHE)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Indexer       │    │   AVS Node      │    │   EigenLayer    │
│   Service       │    │   (Operators)   │    │   Registry      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Policy Creation**: LP creates insurance policy through frontend
2. **Premium Collection**: Uniswap v4 hook automatically collects premiums
3. **IL Monitoring**: System monitors LP positions for impermanent loss
4. **Claim Processing**: When IL occurs, claim is submitted confidentially
5. **Verification**: AVS operators verify claim validity
6. **Payout**: Smart contracts execute payout to LP

### Technology Stack

- **Blockchain**: Ethereum (Sepolia testnet)
- **Smart Contracts**: Solidity 0.8.26, Foundry framework
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Privacy**: Fhenix FHE for confidential computations
- **Consensus**: EigenLayer AVS for decentralized validation
- **Wallet Integration**: wagmi, WalletConnect

---

## Smart Contracts

### Contract Architecture

The smart contract system consists of several interconnected contracts, each serving specific purposes:

```
ConfidentialILHook (Uniswap v4 Hook)
    │
    ├── PolicyManager (Policy lifecycle management)
    │   ├── InsuranceVault (Premium collection)
    │   └── PayoutVault (Claim payouts)
    │
    ├── EigenAVSManager (Operator management)
    │   └── SettlementService (Claim verification)
    │
    └── FhenixComputeProxy (Confidential calculations)
```

### Core Contracts

#### 1. ConfidentialILHook.sol

**Location**: `contracts/hooks/ConfidentialILHook.sol`

**Purpose**: Main Uniswap v4 hook that integrates IL insurance into the AMM

**Key Functionality**:

- Intercepts liquidity provision events
- Automatically collects insurance premiums
- Triggers policy creation and updates
- Manages hook permissions and access control

**Key Functions**:

```solidity
function beforeAddLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external returns (bytes4);

function afterAddLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external returns (bytes4, BalanceDelta);
```

**Integration Points**:

- Connects to PolicyManager for policy operations
- Interfaces with InsuranceVault for premium handling
- Communicates with FhenixComputeProxy for IL calculations

#### 2. PolicyManager.sol

**Location**: `contracts/PolicyManager.sol`

**Purpose**: Manages the complete lifecycle of insurance policies

**Key Functionality**:

- Policy creation and registration
- Premium calculation and collection
- Policy state management (active, claimed, settled, expired)
- Integration with external verification systems

**Key Data Structures**:

```solidity
struct Policy {
    address lp;                    // Liquidity provider
    address pool;                  // Uniswap pool address
    PolicyParams params;           // Policy parameters
    bytes32 entryCommit;          // Confidential entry commitment
    uint256 createdAt;            // Creation timestamp
    uint256 epoch;                // Current epoch
    bool active;                  // Policy status
}

struct PolicyParams {
    uint256 deductibleBps;        // Deductible in basis points
    uint256 capBps;               // Coverage cap in basis points
    uint256 premiumBps;           // Premium rate in basis points
    uint256 duration;             // Policy duration in blocks
    address pool;                 // Associated pool
}
```

**Key Functions**:

```solidity
function mintPolicy(
    address lp,
    address pool,
    PolicyParams calldata params,
    bytes32 entryCommit
) external returns (uint256 policyId);

function burnPolicy(uint256 policyId) external;

function updatePolicyCommitment(
    uint256 policyId,
    bytes32 newCommit
) external;
```

#### 3. InsuranceVault.sol

**Location**: `contracts/vaults/InsuranceVault.sol`

**Purpose**: Manages premium collection and reserve funds

**Key Functionality**:

- Collects and stores premium payments
- Maintains pool-specific reserves
- Calculates solvency ratios
- Interfaces with claim payment system

**Key Functions**:

```solidity
function depositPremium(address pool, uint256 amount) external;
function solventFor(uint256 payout) external view returns (bool);
function payClaim(uint256 policyId, address to, uint256 amount) external;
function getVaultStats(address pool) external view returns (
    uint256 totalReserves,
    uint256 totalPremiums,
    uint256 totalClaims,
    uint256 reserveRatio
);
```

#### 4. PayoutVault.sol

**Location**: `contracts/vaults/PayoutVault.sol`

**Purpose**: Handles general deposits and withdrawals for vault funding

**Key Functionality**:

- Accepts ETH deposits from liquidity providers
- Manages withdrawals with proper access controls
- Maintains vault balance tracking

**Key Functions**:

```solidity
function deposit(uint256 amount) external payable;
function withdraw(address to, uint256 amount) external;
function balance() external view returns (uint256);
```

#### 5. EigenAVSManager.sol

**Location**: `contracts/EigenAVSManager.sol`

**Purpose**: Manages EigenLayer operators and their validation responsibilities

**Key Functionality**:

- Operator registration and management
- Stake tracking and slashing
- Task assignment for claim validation
- Integration with EigenLayer registry

**Key Functions**:

```solidity
function registerOperator(
    bytes calldata signature,
    ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature
) external;

function updateOperatorSigningKey(
    uint256 operatorId,
    BN254.G1Point memory signingKey
) external;

function createNewTask(
    uint256 policyId,
    bytes32 claimHash,
    uint32 quorumThresholdPercentage,
    bytes calldata quorumNumbers
) external;
```

#### 6. FhenixComputeProxy.sol

**Location**: `contracts/FhenixComputeProxy.sol`

**Purpose**: Interfaces with Fhenix network for confidential computations

**Key Functionality**:

- Submits encrypted data to Fhenix network
- Retrieves confidential computation results
- Manages computation requests and responses

---

### Libraries

#### 1. ILMath.sol

**Location**: `contracts/libraries/ILMath.sol`

**Purpose**: Core mathematical functions for impermanent loss calculations

**Key Functions**:

```solidity
// Calculate hodl value (if tokens were held instead of LP'ed)
function calculateHodlValue(
    uint256 x0,    // Initial token0 amount
    uint256 y0,    // Initial token1 amount
    uint256 P1     // Current price
) internal pure returns (uint256 hodlValue);

// Calculate current LP position value
function calculateLPValue(
    uint256 x1,    // Current token0 in LP
    uint256 y1,    // Current token1 in LP
    uint256 fees,  // Accumulated fees
    uint256 P1     // Current price
) internal pure returns (uint256 lpValue);

// Calculate impermanent loss
function calculateIL(
    uint256 hodlValue,
    uint256 lpValue
) internal pure returns (uint256 impermanentLoss);

// Calculate insurance payout with cap and deductible
function calculatePayout(
    uint256 impermanentLoss,
    uint256 hodlValue,
    uint16 capBps,
    uint16 deductibleBps
) internal pure returns (uint256 payout);
```

**Mathematical Formulas**:

1. **Hodl Value**: `V_hodl = x0 * P1 + y0`
2. **LP Value**: `V_lp = x1 * P1 + y1 + fees`
3. **Impermanent Loss**: `IL = max(0, V_hodl - V_lp)`
4. **Payout**: `min(capBps * V_hodl / 10000, max(0, IL - deductibleBps * IL / 10000))`

#### 2. PremiumMath.sol

**Location**: `contracts/libraries/PremiumMath.sol`

**Purpose**: Premium calculation logic based on risk assessment

**Key Functions**:

- Risk-based premium calculation
- Pool volatility assessment
- Dynamic pricing models

---

## Frontend Application

### Architecture

The frontend is built with Next.js 14 and follows a modular, component-based architecture:

```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── dashboard/         # Dashboard pages
│   ├── policy/           # Policy management pages
│   └── vault/            # Vault management pages
├── components/           # Reusable UI components
├── lib/                 # Utilities and configurations
└── hooks/               # Custom React hooks
```

### Key Components

#### 1. DashboardIntegration.tsx

**Location**: `frontend/components/DashboardIntegration.tsx`

**Purpose**: Main dashboard component integrating all IL insurance functionality

**Key Features**:

- Real-time policy monitoring
- Premium payment interface
- Claim submission flow
- Vault management controls
- Transaction status tracking

**Key Functions**:

```typescript
const handlePolicyMint = async (poolAddress: string, params: PolicyParams);
const handleClaimSubmission = async (policyId: string, claimAmount: string);
const handleVaultDeposit = async (amount: string);
const handleVaultWithdraw = async (amount: string);
```

#### 2. PolicyCard.tsx

**Location**: `frontend/components/PolicyCard.tsx`

**Purpose**: Displays individual policy information and controls

**Key Features**:

- Policy status visualization
- Risk level indicators
- Time remaining calculations
- Action buttons (claim, burn, view details)
- Real-time event monitoring

**Props Interface**:

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

#### 3. VaultStats.tsx

**Location**: `frontend/components/VaultStats.tsx`

**Purpose**: Displays vault statistics and financial metrics

**Key Metrics**:

- Total reserves
- Pool-specific reserves
- Solvency ratios
- Premium collection rates
- Claim payout history

#### 4. ClaimFlow.tsx

**Location**: `frontend/components/ClaimFlow.tsx`

**Purpose**: Handles the multi-step claim submission process

**Flow Steps**:

1. Policy validation
2. IL calculation request
3. Proof generation
4. Claim submission
5. Verification tracking
6. Payout execution

### State Management

#### Store Architecture

**Location**: `frontend/lib/store.ts`

The application uses Zustand for state management with the following structure:

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

  // Actions
  addPolicy: (policy: PolicyState) => void;
  updatePolicy: (id: string, updates: Partial<PolicyState>) => void;
  addTransaction: (transaction: Transaction) => void;
  setVaultStats: (stats: VaultStats) => void;
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

### Blockchain Integration

#### Contract Integration

**Location**: `frontend/lib/contracts.ts`

The contracts file provides:

- ABI definitions for all smart contracts
- Contract address mappings
- Type-safe function interfaces
- Utility functions for contract interaction

**Key Exports**:

```typescript
export const CONFIDENTIAL_IL_HOOK_ABI = [...];
export const POLICY_MANAGER_ABI = [...];
export const INSURANCE_VAULT_ABI = [...];
export const PAYOUT_VAULT_ABI = [...];

export const CONTRACT_ADDRESSES = {
  HOOK: process.env.NEXT_PUBLIC_HOOK_ADDRESS,
  POLICY_MANAGER: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS,
  INSURANCE_VAULT: process.env.NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS,
  PAYOUT_VAULT: process.env.NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS,
  // ...
};
```

#### Transaction Management

**Location**: `frontend/lib/transactions.ts`

Provides hooks for blockchain interactions:

```typescript
// Policy management
export function usePolicyTransactions() {
  return {
    mintPolicy: (params: PolicyParams) => Promise<Hash>,
    submitClaim: (policyId: bigint, amount: bigint, proof: Hash) => Promise<Hash>,
    // ...
  };
}

// Vault operations
export function useVaultTransactions() {
  return {
    deposit: (amount: bigint, recipient: Address) => Promise<Hash>,
    withdraw: (amount: bigint, recipient: Address) => Promise<Hash>,
    // ...
  };
}
```

#### Event Monitoring

**Location**: `frontend/lib/events.ts`

Real-time event monitoring using wagmi:

```typescript
export function usePolicyEvents(policyId: bigint) {
  // Monitor policy-specific events
  const created = useWatchContractEvent({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    eventName: "PolicyCreated",
    // ...
  });

  const claimRequested = useWatchContractEvent({
    address: CONTRACT_ADDRESSES.POLICY_MANAGER,
    abi: POLICY_MANAGER_ABI,
    eventName: "ClaimRequested",
    // ...
  });

  return { created, claimRequested /* ... */ };
}
```

### Wallet Integration

**Location**: `frontend/lib/wagmi.ts`

Wallet connectivity using wagmi and WalletConnect:

```typescript
export const config = createConfig({
  chains: [sepolia],
  connectors: [walletConnect({ projectId }), injected(), metaMask(), safe()],
  transports: {
    [sepolia.id]: http(),
  },
});
```

---

## Backend Services

### 1. Fhenix Service

**Location**: `fhenix-service/`

**Purpose**: Handles confidential impermanent loss calculations using Fully Homomorphic Encryption

#### Architecture

```typescript
// Main service entry point
class FhenixService {
  async calculateIL(encryptedData: EncryptedData): Promise<EncryptedResult>;

  async generateProof(calculation: ILCalculation): Promise<ZKProof>;
}
```

#### Key Files

1. **app.ts**: Express server setup and API routes
2. **ilCalculation.ts**: Core IL calculation logic
3. **signature.ts**: Cryptographic signature handling
4. **types.ts**: TypeScript type definitions

#### API Endpoints

```typescript
POST /calculate-il
  Body: {
    policyId: string;
    encryptedPositionData: string;
    priceData: PriceData;
  }
  Response: {
    encryptedResult: string;
    proof: string;
  }

POST /verify-proof
  Body: {
    proof: string;
    publicInputs: string[];
  }
  Response: {
    valid: boolean;
  }
```

### 2. AVS Node

**Location**: `avs-node/`

**Purpose**: EigenLayer operator node for validating insurance claims

#### Core Components

1. **AVSNode.ts**: Main operator node implementation
2. **AVSRegistry.ts**: Registry management for operators
3. **SettlementService.ts**: Claim settlement logic
4. **SlashingService.ts**: Operator slashing mechanism
5. **ConsensusManager.ts**: Consensus coordination

#### Key Functionality

```typescript
class AVSNode {
  async validateClaim(claimData: ClaimData): Promise<ValidationResult>;

  async submitAttestation(policyId: bigint, isValid: boolean, signature: Signature): Promise<void>;

  async handleSlashing(operatorId: string, reason: SlashingReason): Promise<void>;
}
```

### 3. Indexer Service

**Location**: `scripts/indexer/`

**Purpose**: Monitors blockchain events and maintains off-chain data

#### Functionality

- Event indexing from smart contracts
- Data aggregation and analytics
- Real-time notifications
- Historical data queries

#### Key Files

1. **index.ts**: Main indexer logic
2. **cli.ts**: Command-line interface
3. **indexer.test.ts**: Comprehensive tests

---

## Libraries and Utilities

### Frontend Utilities

#### 1. Utils Library

**Location**: `frontend/lib/utils.ts`

Common utility functions:

```typescript
// Format utilities
export function formatEther(wei: bigint): string;
export function formatPercent(bps: number): string;
export function formatAddress(address: string): string;

// Validation utilities
export function isValidAddress(address: string): boolean;
export function isValidAmount(amount: string): boolean;

// Date utilities
export function formatTimestamp(timestamp: number): string;
export function getTimeRemaining(endTime: number): string;
```

#### 2. Contract Utilities

Helper functions for contract interactions:

```typescript
export const encodeInsuranceData = (params: {
  deductibleBps: number;
  capBps: number;
  premiumBps: number;
  duration: number;
}) => {
  // Encode parameters for hook data
};

export const getContractUrl = (contractName: string) => {
  // Generate etherscan URLs
};

export const formatClaimStatus = (status: number): ClaimStatus => {
  // Convert numeric status to enum
};
```

### Smart Contract Libraries

#### Custom Libraries

1. **ILMath.sol**: Mathematical functions for IL calculations
2. **PremiumMath.sol**: Premium calculation logic

#### External Dependencies

1. **OpenZeppelin v5.0.2**: Security-audited contract components
2. **Uniswap v4 Periphery**: Hook interfaces and utilities

---

## Development Setup

### Prerequisites

1. **Node.js**: Version 18+ recommended
2. **Foundry**: Latest version for smart contract development
3. **Git**: For version control

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/LayintonDev/Confidential-iImpermanent-Loss-Insurance-for-Lps.git
cd Confidential-iImpermanent-Loss-Insurance-for-Lps

# Install dependencies
npm install

# Initialize git submodules
git submodule update --init --recursive

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Smart Contract Development

```bash
# Install Foundry dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test

# Deploy to testnet
./deploy-sepolia.sh
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Configure with your contract addresses

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Services

#### Fhenix Service

```bash
cd fhenix-service

# Install dependencies
npm install

# Run tests
npm test

# Start service
npm start
```

#### AVS Node

```bash
cd avs-node

# Install dependencies
npm install

# Configure operator
cp .env.example .env
# Add your operator configuration

# Start node
npm start
```

### Environment Configuration

#### Smart Contracts (.env)

```bash
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
```

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_HOOK_ADDRESS=0x...
NEXT_PUBLIC_POLICY_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS=0x...
NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## API Reference

### Smart Contract ABIs

#### PolicyManager

```solidity
interface IPolicyManager {
    function mintPolicy(
        address lp,
        address pool,
        PolicyParams calldata params,
        bytes32 entryCommit
    ) external returns (uint256 policyId);

    function submitClaim(
        uint256 policyId,
        uint256 amount,
        bytes32 merkleProof
    ) external;

    function policies(uint256 policyId) external view returns (Policy memory);
}
```

#### InsuranceVault

```solidity
interface IInsuranceVault {
    function depositPremium(address pool, uint256 amount) external;
    function solventFor(uint256 payout) external view returns (bool);
    function payClaim(uint256 policyId, address to, uint256 amount) external;
}
```

### Frontend Hooks

#### usePolicyManager

```typescript
export function usePolicyManager() {
  return {
    mintPolicy: (params: PolicyParams) => Promise<Hash>,
    submitClaim: (policyId: bigint, amount: bigint, proof: Hash) => Promise<Hash>,
    burnPolicy: (policyId: bigint) => Promise<Hash>,
    getPolicyDetails: (policyId: bigint) => Promise<Policy>,
  };
}
```

#### useInsuranceVault

```typescript
export function useInsuranceVault() {
  return {
    checkSolvency: (amount: bigint) => Promise<boolean>,
    getReserves: (pool: Address) => Promise<bigint>,
    getTotalReserves: () => Promise<bigint>,
  };
}
```

### REST API (Fhenix Service)

#### Calculate IL

```http
POST /api/calculate-il
Content-Type: application/json

{
  "policyId": "123",
  "encryptedData": "0x...",
  "currentPrice": "1500.50"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "encryptedResult": "0x...",
    "proof": "0x...",
    "calculationId": "calc_123"
  }
}
```

---

## Deployment Guide

### Smart Contract Deployment

#### Sepolia Testnet

```bash
# Make deploy script executable
chmod +x deploy-sepolia.sh

# Deploy all contracts
./deploy-sepolia.sh

# Verify contracts
forge verify-contract \
  --chain sepolia \
  --constructor-args $(cast abi-encode "constructor(address)" 0x...) \
  <CONTRACT_ADDRESS> \
  src/PolicyManager.sol:PolicyManager
```

#### Manual Deployment

```bash
# Deploy individual contracts
forge create --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/PolicyManager.sol:PolicyManager \
  --constructor-args 0x... # constructor arguments
```

### Frontend Deployment

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
cd frontend
vercel --prod
```

#### Environment Setup

Ensure all environment variables are configured in your deployment platform:

- `NEXT_PUBLIC_HOOK_ADDRESS`
- `NEXT_PUBLIC_POLICY_MANAGER_ADDRESS`
- `NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS`
- `NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Service Deployment

#### Docker Deployment

```dockerfile
# Fhenix Service Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t fhenix-service .
docker run -p 3001:3001 fhenix-service
```

---

## Testing Guide

### Smart Contract Tests

#### Running Tests

```bash
# Run all tests
forge test

# Run specific test file
forge test --match-path test/PolicyManager.t.sol

# Run with verbose output
forge test -vvv

# Generate gas report
forge test --gas-report

# Run with coverage
forge coverage
```

#### Test Structure

```solidity
contract PolicyManagerTest is Test {
    PolicyManager policyManager;
    InsuranceVault vault;

    function setUp() public {
        // Setup test environment
        vault = new InsuranceVault();
        policyManager = new PolicyManager(address(vault));
    }

    function testMintPolicy() public {
        // Test policy minting
        PolicyParams memory params = PolicyParams({
            deductibleBps: 500,
            capBps: 8000,
            premiumBps: 100,
            duration: 7200,
            pool: address(0x123)
        });

        uint256 policyId = policyManager.mintPolicy(
            address(this),
            address(0x123),
            params,
            bytes32(0)
        );

        assertEq(policyId, 1);
    }
}
```

### Frontend Tests

#### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
```

#### Component Testing

```typescript
// __tests__/PolicyCard.test.tsx
import { render, screen } from "@testing-library/react";
import PolicyCard from "@/components/PolicyCard";

describe("PolicyCard", () => {
  const mockPolicy = {
    id: "1",
    pool: "0x123...",
    params: {
      deductibleBps: 500n,
      capBps: 8000n,
      premiumBps: 100n,
      duration: 7200n,
    },
    // ... other properties
  };

  it("renders policy information correctly", () => {
    render(<PolicyCard policy={mockPolicy} />);

    expect(screen.getByText("Policy #1")).toBeInTheDocument();
    expect(screen.getByText(/0x123.../)).toBeInTheDocument();
  });
});
```

### Integration Tests

#### End-to-End Testing

```typescript
// e2e/policy-lifecycle.test.ts
describe("Policy Lifecycle", () => {
  it("should create, claim, and settle a policy", async () => {
    // 1. Connect wallet
    await connectWallet();

    // 2. Create policy
    const policyId = await createPolicy({
      pool: TEST_POOL_ADDRESS,
      deductibleBps: 500,
      capBps: 8000,
      premiumBps: 100,
      duration: 7200,
    });

    // 3. Simulate IL event
    await simulateImpermanentLoss(policyId);

    // 4. Submit claim
    await submitClaim(policyId, expectedPayout);

    // 5. Verify settlement
    const policy = await getPolicyDetails(policyId);
    expect(policy.status).toBe("settled");
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Contract Deployment Failures

**Issue**: Contract deployment fails with "gas estimation failed"

**Solution**:

```bash
# Increase gas limit
forge create --gas-limit 5000000 ...

# Check constructor arguments
cast abi-encode "constructor(address,uint256)" 0x... 1000
```

#### 2. Frontend Connection Issues

**Issue**: Wallet connection fails

**Solution**:

1. Check WalletConnect project ID
2. Verify network configuration
3. Ensure contract addresses are correct

#### 3. Transaction Failures

**Issue**: Transactions revert with "execution reverted"

**Solution**:

1. Check contract state (solvency, permissions)
2. Verify function arguments
3. Ensure sufficient gas and ETH balance

### Debugging Tools

#### Smart Contracts

```bash
# Trace transaction
cast run --trace <TX_HASH>

# Call contract function
cast call <CONTRACT> "functionName(uint256)" 123

# Check storage
cast storage <CONTRACT> <SLOT>
```

#### Frontend

```typescript
// Debug blockchain interactions
console.log('Transaction hash:', await contract.mintPolicy(...));

// Check contract state
const policy = await contract.policies(policyId);
console.log('Policy state:', policy);
```

---

## Security Considerations

### Smart Contract Security

1. **Access Control**: All critical functions use proper access modifiers
2. **Reentrancy Protection**: OpenZeppelin's ReentrancyGuard used where needed
3. **Integer Overflow**: Solidity 0.8.26 provides built-in overflow protection
4. **Input Validation**: Comprehensive validation in all public functions

### Frontend Security

1. **Environment Variables**: Sensitive data stored in environment variables
2. **Input Sanitization**: All user inputs validated and sanitized
3. **Wallet Security**: Secure wallet connection practices
4. **XSS Protection**: React's built-in XSS protection

### Privacy Protection

1. **FHE Integration**: Sensitive calculations performed using Fhenix FHE
2. **Zero-Knowledge Proofs**: Claims verified without revealing private data
3. **Confidential Commitments**: Policy data encrypted using commitments

---

## Performance Optimization

### Smart Contracts

1. **Gas Optimization**: Efficient data structures and algorithms
2. **Batch Operations**: Multiple operations combined where possible
3. **Storage Optimization**: Minimal storage usage patterns

### Frontend

1. **Code Splitting**: React lazy loading for route-based splitting
2. **Caching**: Aggressive caching of blockchain data
3. **Optimistic Updates**: UI updates before transaction confirmation

---

## Future Enhancements

### Planned Features

1. **Multi-chain Support**: Expand to other EVM chains
2. **Advanced Risk Models**: Machine learning-based risk assessment
3. **Governance Token**: Decentralized governance implementation
4. **Mobile App**: React Native mobile application

### Technical Improvements

1. **Layer 2 Integration**: Deploy on Polygon/Arbitrum for lower fees
2. **Advanced FHE**: More sophisticated confidential computations
3. **Real-time Oracle**: Custom oracle for IL calculations
4. **Advanced Analytics**: Enhanced dashboard with predictive analytics

---

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Write tests for new functionality
4. Implement feature with proper documentation
5. Run test suite: `npm test` or `forge test`
6. Submit pull request with detailed description

### Code Standards

1. **Solidity**: Follow Solidity style guide and NatSpec documentation
2. **TypeScript**: Use strict typing and follow ESLint configuration
3. **Testing**: Maintain high test coverage (>90%)
4. **Documentation**: Update documentation for all changes

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Support

For technical support or questions:

1. **GitHub Issues**: Create an issue for bugs or feature requests
2. **Documentation**: Check this comprehensive guide first
3. **Community**: Join our Discord community for discussions

---

_This documentation covers the complete Confidential Impermanent Loss Insurance system. For specific implementation details, refer to the source code and inline comments._

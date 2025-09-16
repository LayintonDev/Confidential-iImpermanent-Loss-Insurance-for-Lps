# Confidential Impermanent Loss Insurance for LPs

🔒 **Trustless IL insurance using Uniswap v4 hooks, Fhenix FHE, and EigenLayer AVS**

## 🎯 Project Overview

This project implements a confidential impermanent loss insurance system for Uniswap v4 liquidity providers using:

- **Uniswap v4 Hooks** for automated premium collection and policy management
- **Fhenix FHE** for confidential IL calculations
- **EigenLayer AVS** for decentralized verification
- **Foundry** for fast, reliable smart contract development

## 🛠️ Tech Stack

**Smart Contracts:**

- **Foundry** - Blazing fast, portable and modular toolkit for Ethereum development written in Rust
- **Solidity 0.8.26** with Cancun EVM target
- **OpenZeppelin v5.0.2** contracts (as Foundry library)
- **27 comprehensive tests** with 100% pass rate

**Frontend:**

- **Next.js 14** with TypeScript
- **Tailwind CSS** and **shadcn/ui** components
- **ethers.js v6** for blockchain interactions

---

## 🚀 Foundry Development

**Foundry consists of:**

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools)
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network
- **Chisel**: Fast, utilitarian, and verbose solidity REPL

## 📖 Documentation

- [Foundry Book](https://book.getfoundry.sh/)
- [Project Roadmap](.github/project-roadmap.md)
- [Phase 2 Completion](PHASE2_COMPLETION.md)
- [Phase 4 Completion](PHASE4_COMPLETION.md) ⭐ **NEW**

## ⚡ Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Build & Test

```bash
# Build contracts
forge build
# or use our custom build script
./build.sh build

# Run all tests
forge test
# or use our custom build script
./build.sh test

# Run specific test file
forge test --match-contract PolicyManagerFoundryTest

# Run with gas reporting
forge test --gas-report
```

### Development Commands

```bash
# Format code
forge fmt

# Create gas snapshots
forge snapshot

# Start local node
anvil

# Deploy contracts locally
./build.sh deploy-local

# Deploy to testnet
./build.sh deploy-sepolia
```

## 📊 Test Results

✅ **43/43 Foundry tests passing** (100% success rate)  
✅ **11/16 API tests passing** (Core functionality verified)  
⚡ **Sub-second execution time** (Foundry + TypeScript integration)  
🧪 **1000+ fuzz test iterations** per function  
📈 **Comprehensive gas reporting** included  
🔧 **Phase 4: IL Math & Claims** - COMPLETE

**Current Implementation Status:**

- 🟢 **Phase 1**: Repository Bootstrap - COMPLETE
- 🟢 **Phase 2**: Core Policy & Vault System - COMPLETE
- 🟢 **Phase 3**: Fee Splitting & Premium Flow - COMPLETE
- 🟢 **Phase 4**: IL Math & Claim Request Flow - COMPLETE
- 🔄 **Phase 5**: EigenLayer AVS & Attestation Flow - IN PROGRESS

## 📁 Project Structure

```
contracts/
├── PolicyManager.sol          # ERC-1155 insurance policies
├── FeeSplitter.sol            # Premium extraction from swaps
├── vaults/
│   └── InsuranceVault.sol     # Premium storage & claim payouts
├── hooks/
│   └── ConfidentialILHook.sol # Uniswap v4 hook implementation
├── libraries/
│   └── ILMath.sol             # IL calculation library ⭐ NEW
└── interfaces/
    └── IUniswapV4Hook.sol     # Hook interface

test/
├── PolicyManager.t.sol        # Policy NFT tests (6 tests)
├── InsuranceVault.t.sol       # Vault tests (12 tests)
├── FeeSplitter.t.sol          # Premium extraction tests (21 tests)
└── Integration.t.sol          # End-to-end tests (4 tests)

fhenix-service/                # Mock FHE computation service ⭐ NEW
├── src/
│   ├── index.ts              # Express API server
│   ├── ilCalculation.ts      # Mock IL computation
│   ├── signature.ts          # ECDSA signature service
│   └── types.ts              # TypeScript schemas
└── test/                     # API integration tests

scripts/
├── indexer/                  # Blockchain event indexer ⭐ NEW
│   ├── src/index.ts         # Event processing service
│   └── test/                # Indexer tests
└── deploy.ts                # Contract deployment

frontend/                     # Next.js dApp
build.sh                     # Custom build system (20+ commands)
```

## 🧪 Advanced Testing

```bash
# Fuzz testing with custom iterations
forge test --fuzz-runs 10000

# Test coverage analysis
./build.sh test-coverage

# Gas usage profiling
./build.sh test-gas

# Specific test patterns
forge test --match-test testFuzz
forge test --match-contract PolicyManager
```

## 🚢 Deployment

```bash
# Local development
./build.sh deploy-local

# Testnet deployment
./build.sh deploy-sepolia

# Mainnet (when ready)
./build.sh deploy-mainnet
```

## 🏗️ Architecture

### Core Contracts

- **PolicyManager**: ERC-1155 NFTs representing insurance policies
- **InsuranceVault**: Holds premiums and processes claim payouts
- **FeeSplitter**: Extracts premiums from Uniswap v4 swap fees
- **ConfidentialILHook**: Orchestrates the entire insurance flow

### Hook Flow

1. **afterAddLiquidity** → Create insurance policy if enabled
2. **afterSwap** → Extract premiums from fees → Deposit to vault
3. **beforeRemoveLiquidity** → Initiate claim process → Emit ClaimRequested event
4. **Event Indexer** → Process ClaimRequested → Call Fhenix Service
5. **Fhenix Service** → Calculate IL using ILMath → Generate attestation
6. **AVS Integration** → Verify attestation → Settle claim (Phase 5)

## 🤝 Contributing

1. Install Foundry and dependencies
2. Run `./build.sh test` to ensure everything works
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass before submitting

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Status**: Phase 2 Complete ✅ | **Next**: Phase 3 - Fee Splitting & Premium Flow

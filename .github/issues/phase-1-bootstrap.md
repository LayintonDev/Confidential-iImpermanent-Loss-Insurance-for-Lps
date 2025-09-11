# Phase 1: Repository Bootstrap & Initial Setup

## Epic Overview

Bootstrap the repository structure, set up development environment, and create contract skeletons with basic Next.js scaffold.

## Acceptance Criteria

- [ ] Complete repository structure matches the specified layout
- [ ] Hardhat development environment is configured and working
- [ ] All contract skeletons are created with proper interfaces
- [ ] Next.js app is scaffolded with TypeScript and required dependencies
- [ ] Basic README with setup instructions is complete
- [ ] Development scripts and package.json are configured

## Technical Requirements

### Repository Structure

Create exact folder structure:

```
confidential-il-insurance-hook/
├── contracts/
│   ├── hooks/ConfidentialILHook.sol
│   ├── vaults/InsuranceVault.sol
│   ├── vaults/PayoutVault.sol
│   ├── EigenAVSManager.sol
│   ├── FhenixComputeProxy.sol
│   └── interfaces/IUniswapV4Hook.sol
├── avs/
│   └── src/
├── fhenix-service/
│   └── src/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── scripts/
├── test/
├── hardhat.config.ts
├── package.json
└── README.md
```

### Contract Skeletons

- [ ] `IUniswapV4Hook.sol` - Interface with all required hook callbacks
- [ ] `ConfidentialILHook.sol` - Hook contract skeleton with function stubs
- [ ] `InsuranceVault.sol` - Vault contract with premium and payout functions
- [ ] `PayoutVault.sol` - Separate vault for handling claim payouts
- [ ] `EigenAVSManager.sol` - AVS manager with attestation verification
- [ ] `FhenixComputeProxy.sol` - Proxy for Fhenix compute results

### Development Environment

- [ ] Hardhat configuration with TypeScript
- [ ] Network configurations (local, testnet)
- [ ] Solidity compiler settings (0.8.x)
- [ ] Gas reporter and coverage tools
- [ ] ESLint and Prettier configuration

### Next.js Frontend Scaffold

- [ ] App Router setup with TypeScript
- [ ] Tailwind CSS configuration
- [ ] ShadCN UI components setup
- [ ] Wagmi + RainbowKit wallet integration
- [ ] Basic routing structure (`/`, `/dashboard`, `/vault`, `/policy/[id]`)

### Package Configuration

- [ ] Root package.json with all dependencies
- [ ] Frontend package.json with Next.js dependencies
- [ ] Scripts for testing, building, and development
- [ ] Environment variable templates (.env.example)

## Definition of Done

- [ ] `npm install` runs successfully in root and frontend directories
- [ ] `npx hardhat compile` compiles all contract skeletons
- [ ] `npm run dev` starts Next.js development server
- [ ] All folders and files match the specified structure exactly
- [ ] README includes clear setup and run instructions
- [ ] No committed secrets or private keys

## Dependencies

- Hardhat
- TypeScript
- ethers.js
- Next.js 14+ (App Router)
- Tailwind CSS
- Wagmi v2
- RainbowKit
- ShadCN UI
- Zod for validation

## Estimated Time

2-3 days

## Priority

P0 - Blocking

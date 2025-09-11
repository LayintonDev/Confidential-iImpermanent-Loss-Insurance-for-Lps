# Confidential IL Insurance Hook

A Uniswap v4 hook that provides **confidential impermanent loss insurance** for LPs using Fhenix FHE for private computation and EigenLayer AVS for decentralized verification.

## 🌟 Overview

This project implements a comprehensive insurance system for Uniswap v4 liquidity providers:

- **Automated Premium Collection**: Premiums are automatically skimmed from swap fees
- **Confidential IL Calculation**: Position data is encrypted using Fhenix FHE technology
- **Decentralized Verification**: EigenLayer AVS operators verify claims and process payouts
- **Modern Web3 Frontend**: Professional black & green themed Next.js dashboard with AppKit wallet integration

## 🎨 **Current Status: Phase 1+ Complete**

✅ **Smart Contract Architecture**: All 6 core contracts implemented and compiling
✅ **Modern Web3 Frontend**: Professional interface with black/green Matrix-inspired theme
✅ **AppKit Integration**: Seamless wallet connectivity with multi-network support
✅ **Development Environment**: Fully operational for continued development

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Uniswap v4     │    │  Confidential    │    │  Insurance      │
│  Pool           │───▶│  IL Hook         │───▶│  Vault          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Fhenix FHE     │    │  EigenLayer      │    │  Modern Web3    │
│  Computing      │◀───│  AVS Manager     │───▶│  Frontend       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
confidential-il-insurance-hook/
├── contracts/                 # Smart contracts (✅ COMPLETE)
│   ├── hooks/                 # Uniswap v4 hook implementation
│   ├── vaults/                # Insurance and payout vaults
│   ├── EigenAVSManager.sol    # EigenLayer AVS management
│   └── FhenixComputeProxy.sol # Fhenix FHE integration
├── frontend/                  # Modern Web3 frontend (✅ MODERNIZED)
│   ├── app/                   # Next.js 14 App Router
│   ├── components/            # React components
│   ├── lib/                   # AppKit configuration
│   └── tailwind.config.js     # Black & green theme
├── scripts/                   # Deployment and utility scripts
└── test/                      # Test suites
```

## 🎨 Frontend Features

### **Modern Web3 Interface**

- **Black & Green Theme**: Matrix-inspired cyberpunk aesthetic
- **AppKit Integration**: Seamless wallet connectivity (MetaMask, Trust, Coinbase)
- **Multi-Network Support**: Ethereum, Arbitrum, Polygon, Base
- **Framer Motion**: Sophisticated animations and micro-interactions

### **Design System**

- **Glass Morphism**: Custom backdrop-blur effects with green borders
- **Neon Effects**: Green glow animations and gradient text
- **Cyber Grid**: Animated background patterns
- **Responsive Design**: Mobile-first responsive layout

### **Technology Stack**

- **Next.js 14**: App Router with TypeScript
- **AppKit (Reown)**: Modern wallet connection system
- **Tailwind CSS**: Utility-first styling with custom theme
- **Framer Motion**: Advanced animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Git

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/LayintonDev/Confidential-iImpermanent-Loss-Insurance-for-Lps.git
   cd confidential-il-insurance-hook
   ```

2. **Install dependencies**:

   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start local development**:
   ```bash
   npm run start:local
   ```

This will start:

- Local Hardhat network
- Mock Fhenix service
- Mock AVS node
- Event indexer
- Next.js frontend

## 🧪 Testing

### Run all tests:

```bash
npm test
```

### Run specific test suites:

```bash
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:coverage       # Coverage report
```

## 📝 Smart Contracts

### Core Contracts

- **`ConfidentialILHook.sol`** - Uniswap v4 hook managing policy lifecycle and premium collection
- **`InsuranceVault.sol`** - Holds premiums and processes claim payouts
- **`EigenAVSManager.sol`** - Manages operators and verifies attestations
- **`FhenixComputeProxy.sol`** - Interface for Fhenix FHE computation results

### Key Events

```solidity
event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool, uint256 epoch);
event PremiumSkimmed(address indexed pool, uint256 amount);
event ClaimRequested(uint256 indexed policyId, bytes32 commitmentC);
event ClaimAttested(uint256 indexed policyId, bytes attestationHash);
event ClaimSettled(uint256 indexed policyId, uint256 payout, address indexed to);
```

## 🔧 Development

### Compile contracts:

```bash
npm run compile
```

### Deploy to local network:

```bash
npm run deploy:local
```

### Deploy to testnet:

```bash
npm run deploy:sepolia
```

### Lint code:

```bash
npm run lint
npm run format
```

## 🌐 Frontend

The frontend is built with:

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Wagmi + RainbowKit
- ShadCN UI components

### Development:

```bash
cd frontend
npm run dev
```

### Build for production:

```bash
cd frontend
npm run build
```

## 📊 Features

### For Liquidity Providers

- ✅ One-click insurance activation when adding liquidity
- ✅ Automatic premium deduction from fees
- ✅ Privacy-preserving IL calculations
- ✅ Streamlined claim process
- ✅ Real-time policy and vault statistics

### For Operators

- ✅ Simple operator registration with stake
- ✅ Automated reward distribution
- ✅ Slashing protection for honest behavior
- ✅ Performance metrics tracking

## 🔐 Security

- **Access Control**: Role-based permissions using OpenZeppelin
- **Reentrancy Protection**: Guards on all state-changing functions
- **Custom Errors**: Gas-efficient error handling
- **Formal Verification**: Property-based testing with invariants

## 🧭 Roadmap

### Phase 1: MVP (Current)

- [x] Basic contract architecture
- [x] Mock Fhenix and AVS services
- [x] Frontend scaffold
- [ ] Complete integration testing

### Phase 2: Advanced Features

- [ ] Real Fhenix FHE integration
- [ ] Production EigenLayer AVS
- [ ] Advanced operator economics
- [ ] Governance mechanisms

### Phase 3: Production

- [ ] Security audits
- [ ] Mainnet deployment
- [ ] Community launch

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- [Discord](https://discord.gg/your-discord)
- [Twitter](https://twitter.com/your-handle)
- [Documentation](https://docs.your-project.com)

## 🏆 Acknowledgments

Built for the Hookathon using:

- [Uniswap v4](https://uniswap.org/)
- [Fhenix](https://fhenix.zone/)
- [EigenLayer](https://eigenlayer.xyz/)
- [Next.js](https://nextjs.org/)
- [Hardhat](https://hardhat.org/)

---

**⚠️ Disclaimer**: This is experimental software. Use at your own risk. Not audited for production use.

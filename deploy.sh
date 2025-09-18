#!/bin/bash

# EigenLayer Confidential Insurance Deployment Script
# Deploys contracts to Base Sepolia testnet with real EigenLayer integration

set -e

echo "🚀 Deploying EigenLayer Confidential Insurance to Base Sepolia Testnet"

# Base Sepolia configuration
NETWORK="base-sepolia"
RPC_URL="https://sepolia.base.org"
CHAIN_ID="84532"

# EigenLayer contract addresses on Base Sepolia (these would be the actual addresses)
DELEGATION_MANAGER="0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A"
AVS_DIRECTORY="0x055733000064333CaDDbC92763c58BF0192fFeBf"
REGISTRY_COORDINATOR="0x53012C69A189cfA2D9d29eb6F19B32e0A2EA3490"
STAKE_REGISTRY="0x006124Ae7976137266feeBFb3F4043C3101820BA"

# Insurance contract parameters
MINIMUM_STAKE="1000000000000000000"  # 1 ETH
QUORUM_THRESHOLD="6667"              # 66.67% (in basis points)

echo "📋 Configuration:"
echo "  Network: $NETWORK"
echo "  Chain ID: $CHAIN_ID"
echo "  Delegation Manager: $DELEGATION_MANAGER"
echo "  AVS Directory: $AVS_DIRECTORY"
echo "  Registry Coordinator: $REGISTRY_COORDINATOR"
echo "  Stake Registry: $STAKE_REGISTRY"
echo "  Minimum Stake: $MINIMUM_STAKE"
echo "  Quorum Threshold: $QUORUM_THRESHOLD%"

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    echo "   Set it with: export PRIVATE_KEY=your_private_key"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd contracts
npm install

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile

# Deploy EigenLayer Service Manager
echo "🚀 Deploying EigenLayerServiceManager..."

cat > scripts/deploy.js << 'EOF'
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy EigenLayerServiceManager
  const EigenLayerServiceManager = await ethers.getContractFactory("EigenLayerServiceManager");
  
  const serviceManager = await EigenLayerServiceManager.deploy(
    process.env.DELEGATION_MANAGER,
    process.env.AVS_DIRECTORY,
    process.env.REGISTRY_COORDINATOR,
    process.env.STAKE_REGISTRY,
    process.env.MINIMUM_STAKE,
    process.env.QUORUM_THRESHOLD
  );

  await serviceManager.deployed();

  console.log("✅ EigenLayerServiceManager deployed to:", serviceManager.address);
  
  // Deploy Confidential Insurance Contract
  const ConfidentialInsurance = await ethers.getContractFactory("ConfidentialInsurance");
  
  const insurance = await ConfidentialInsurance.deploy(
    serviceManager.address,
    deployer.address // treasury address
  );

  await insurance.deployed();

  console.log("✅ ConfidentialInsurance deployed to:", insurance.address);

  // Output deployment info
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Network:", process.env.HARDHAT_NETWORK);
  console.log("Deployer:", deployer.address);
  console.log("EigenLayerServiceManager:", serviceManager.address);
  console.log("ConfidentialInsurance:", insurance.address);
  console.log("\n🔗 Verification commands:");
  console.log(`npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${serviceManager.address} ${process.env.DELEGATION_MANAGER} ${process.env.AVS_DIRECTORY} ${process.env.REGISTRY_COORDINATOR} ${process.env.STAKE_REGISTRY} ${process.env.MINIMUM_STAKE} ${process.env.QUORUM_THRESHOLD}`);
  console.log(`npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${insurance.address} ${serviceManager.address} ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
EOF

# Create hardhat config for Base Sepolia
cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei
    }
  },
  etherscan: {
    apiKey: {
      "base-sepolia": process.env.BASESCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};
EOF

# Set environment variables for deployment
export DELEGATION_MANAGER=$DELEGATION_MANAGER
export AVS_DIRECTORY=$AVS_DIRECTORY
export REGISTRY_COORDINATOR=$REGISTRY_COORDINATOR
export STAKE_REGISTRY=$STAKE_REGISTRY
export MINIMUM_STAKE=$MINIMUM_STAKE
export QUORUM_THRESHOLD=$QUORUM_THRESHOLD
export HARDHAT_NETWORK=$NETWORK

# Deploy contracts
echo "🚀 Deploying contracts to $NETWORK..."
npx hardhat run scripts/deploy.js --network $NETWORK

echo "✅ Deployment completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Register operators with the EigenLayer service"
echo "2. Start the EigenLayer compute service"
echo "3. Configure the frontend to use the deployed contracts"
echo "4. Test insurance policy creation and claims"

# Save deployment configuration
cat > deployment-config.json << EOF
{
  "network": "$NETWORK",
  "chainId": "$CHAIN_ID",
  "rpcUrl": "$RPC_URL",
  "contracts": {
    "delegationManager": "$DELEGATION_MANAGER",
    "avsDirectory": "$AVS_DIRECTORY",
    "registryCoordinator": "$REGISTRY_COORDINATOR",
    "stakeRegistry": "$STAKE_REGISTRY"
  },
  "parameters": {
    "minimumStake": "$MINIMUM_STAKE",
    "quorumThreshold": "$QUORUM_THRESHOLD"
  }
}
EOF

echo "📋 Deployment configuration saved to deployment-config.json"

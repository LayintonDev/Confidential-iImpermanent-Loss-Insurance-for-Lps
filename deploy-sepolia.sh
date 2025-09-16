#!/bin/bash

# Sepolia Deployment Script
# This script deploys all contracts to Sepolia testnet and verifies them

set -e  # Exit on any error

echo "🚀 Starting Sepolia Deployment Process..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your values"
    exit 1
fi

# Source environment variables
source .env

# Check required environment variables
required_vars=("PRIVATE_KEY" "SEPOLIA_RPC_URL" "ETHERSCAN_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done

echo "✅ Environment variables loaded"

# Check Foundry installation
if ! command -v forge &> /dev/null; then
    echo "❌ Error: Foundry not found. Please install Foundry first:"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    echo "foundryup"
    exit 1
fi

echo "✅ Foundry found"

# Check wallet balance
echo "📊 Checking deployer balance..."
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL)
BALANCE_ETH=$(cast to-unit $BALANCE ether)

echo "Deployer Address: $DEPLOYER_ADDRESS"
echo "Balance: $BALANCE_ETH ETH"

# Check if balance is sufficient (at least 0.1 ETH)
if (( $(echo "$BALANCE_ETH < 0.1" | bc -l) )); then
    echo "⚠️  Warning: Low balance! You might need more ETH for deployment"
    echo "Get Sepolia ETH from: https://sepoliafaucet.com/"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Sufficient balance confirmed"

# Compile contracts
echo "🔨 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo "✅ Contracts compiled successfully"

# Run deployment
echo "🚀 Deploying contracts to Sepolia..."
forge script script/DeploySepolia.s.sol:DeploySepoliaScript \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "✅ Deployment completed successfully!"

# Extract addresses from deployment logs
echo "📝 Extracting contract addresses..."
DEPLOYMENT_LOG=$(find broadcast/DeploySepolia.s.sol/11155111 -name "*.json" | head -1)

if [ -f "$DEPLOYMENT_LOG" ]; then
    echo "✅ Deployment log found: $DEPLOYMENT_LOG"
    
    # Parse addresses (you may need to adjust these based on actual log format)
    POLICY_MANAGER=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | select(.contractName == "PolicyManager") | .contractAddress' "$DEPLOYMENT_LOG")
    INSURANCE_VAULT=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | select(.contractName == "InsuranceVault") | .contractAddress' "$DEPLOYMENT_LOG")
    PAYOUT_VAULT=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | select(.contractName == "PayoutVault") | .contractAddress' "$DEPLOYMENT_LOG")
    HOOK_ADDRESS=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | select(.contractName == "ConfidentialILHook") | .contractAddress' "$DEPLOYMENT_LOG")
    AVS_MANAGER=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | select(.contractName == "EigenAVSManager") | .contractAddress' "$DEPLOYMENT_LOG")
    FHENIX_PROXY=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | select(.contractName == "FhenixComputeProxy") | .contractAddress' "$DEPLOYMENT_LOG")
    
    # Update .env file with deployed addresses
    echo "📝 Updating .env file with deployed addresses..."
    
    # Create a temporary file with updated values
    sed -i.bak \
        -e "s/POLICY_MANAGER_ADDRESS=.*/POLICY_MANAGER_ADDRESS=$POLICY_MANAGER/" \
        -e "s/INSURANCE_VAULT_ADDRESS=.*/INSURANCE_VAULT_ADDRESS=$INSURANCE_VAULT/" \
        -e "s/PAYOUT_VAULT_ADDRESS=.*/PAYOUT_VAULT_ADDRESS=$PAYOUT_VAULT/" \
        -e "s/HOOK_ADDRESS=.*/HOOK_ADDRESS=$HOOK_ADDRESS/" \
        -e "s/EIGEN_AVS_MANAGER_ADDRESS=.*/EIGEN_AVS_MANAGER_ADDRESS=$AVS_MANAGER/" \
        -e "s/FHENIX_COMPUTE_PROXY_ADDRESS=.*/FHENIX_COMPUTE_PROXY_ADDRESS=$FHENIX_PROXY/" \
        -e "s/NEXT_PUBLIC_HOOK_ADDRESS=.*/NEXT_PUBLIC_HOOK_ADDRESS=$HOOK_ADDRESS/" \
        -e "s/NEXT_PUBLIC_VAULT_ADDRESS=.*/NEXT_PUBLIC_VAULT_ADDRESS=$INSURANCE_VAULT/" \
        -e "s/NEXT_PUBLIC_POLICY_MANAGER_ADDRESS=.*/NEXT_PUBLIC_POLICY_MANAGER_ADDRESS=$POLICY_MANAGER/" \
        -e "s/NEXT_PUBLIC_AVS_MANAGER_ADDRESS=.*/NEXT_PUBLIC_AVS_MANAGER_ADDRESS=$AVS_MANAGER/" \
        .env
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "================================================"
echo "📋 Contract Addresses:"
echo "PolicyManager:       $POLICY_MANAGER"
echo "InsuranceVault:      $INSURANCE_VAULT"
echo "PayoutVault:         $PAYOUT_VAULT"
echo "ConfidentialILHook:  $HOOK_ADDRESS"
echo "EigenAVSManager:     $AVS_MANAGER"
echo "FhenixComputeProxy:  $FHENIX_PROXY"
echo "================================================"
echo ""
echo "🔗 View on Etherscan:"
echo "PolicyManager:       https://sepolia.etherscan.io/address/$POLICY_MANAGER"
echo "InsuranceVault:      https://sepolia.etherscan.io/address/$INSURANCE_VAULT"
echo "ConfidentialILHook:  https://sepolia.etherscan.io/address/$HOOK_ADDRESS"
echo ""
echo "✅ Next steps:"
echo "1. Verify contracts are working on Etherscan"
echo "2. Update frontend configuration in frontend/.env.local"
echo "3. Test contract interactions"
echo "4. Fund the InsuranceVault with initial liquidity"
echo ""
echo "💡 Frontend setup:"
echo "cd frontend && cp .env.example .env.local"
echo "# Then update the contract addresses in .env.local"
echo ""

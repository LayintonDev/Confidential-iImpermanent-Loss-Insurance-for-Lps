#!/bin/bash

# EigenLayer AVS Node Startup Script
# This script initializes and starts the AVS node with real EigenLayer integration

set -e

echo "🚀 Starting EigenLayer AVS Node for Confidential IL Insurance"
echo "============================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with required variables."
    echo "📖 See EIGENLAYER_INTEGRATION.md for configuration details"
    exit 1
fi

# Load environment variables
source .env

# Required environment variables check
required_vars=(
    "OPERATOR_PRIVATE_KEY"
    "EIGENLAYER_DELEGATION_MANAGER"
    "EIGENLAYER_AVS_DIRECTORY"
    "EIGENLAYER_REGISTRY_COORDINATOR"
    "EIGENLAYER_STAKE_REGISTRY"
    "AVS_MANAGER_ADDRESS"
    "RPC_URL"
)

echo "🔍 Checking required environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
    echo "✅ $var is set"
done

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building AVS Node..."
npm run build

# Check if operator is already registered
echo "🔍 Checking operator registration status..."
OPERATOR_ADDRESS=$(node -e "
const ethers = require('ethers');
const wallet = new ethers.Wallet('$OPERATOR_PRIVATE_KEY');
console.log(wallet.address);
")

echo "🏗️ Operator address: $OPERATOR_ADDRESS"

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the AVS node
echo "🎯 Starting EigenLayer AVS Node..."
echo "📊 Configuration:"
echo "   - Operator: $OPERATOR_ADDRESS"
echo "   - Network: Chain ID $CHAIN_ID"
echo "   - RPC URL: $RPC_URL"
echo "   - Service Manager: $AVS_MANAGER_ADDRESS"
echo "   - Minimum Stake: $MINIMUM_STAKE"
echo "   - Signature Threshold: $SIGNATURE_THRESHOLD%"

# Start the node with PM2 for production or directly for development
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting with PM2..."
    pm2 start dist/index.js --name "eigenlayer-avs-node" --env production
    pm2 logs eigenlayer-avs-node
else
    echo "🔄 Starting directly..."
    node dist/index.js
fi

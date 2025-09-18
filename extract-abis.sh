#!/bin/bash

# Script to extract ABIs from compiled contracts and update frontend

echo "Extracting ABIs from compiled contracts..."

# Create ABIs directory if it doesn't exist
mkdir -p frontend/lib/abi

# Extract key contract ABIs
echo "Extracting PolicyManager ABI..."
jq '.abi' out/PolicyManager.sol/PolicyManager.json > frontend/lib/abi/PolicyManager.json

echo "Extracting InsuranceVault ABI..."
jq '.abi' out/InsuranceVault.sol/InsuranceVault.json > frontend/lib/abi/InsuranceVault.json

echo "Extracting ConfidentialILHook ABI..."
jq '.abi' out/ConfidentialILHook.sol/ConfidentialILHook.json > frontend/lib/abi/ConfidentialILHook.json

echo "Extracting EigenAVSManagerV2 ABI..."
jq '.abi' out/EigenAVSManagerV2.sol/EigenAVSManagerV2.json > frontend/lib/abi/EigenAVSManagerV2.json

echo "Extracting FhenixComputeProxy ABI..."
jq '.abi' out/FhenixComputeProxy.sol/FhenixComputeProxy.json > frontend/lib/abi/FhenixComputeProxy.json

echo "Extracting FeeSplitter ABI..."
jq '.abi' out/FeeSplitter.sol/FeeSplitter.json > frontend/lib/abi/FeeSplitter.json

echo "ABIs extracted successfully!"

echo "Next steps:"
echo "1. Deploy contracts: forge script script/DeployUpdatedContracts.s.sol --rpc-url \$SEPOLIA_RPC_URL --private-key \$PRIVATE_KEY --broadcast --verify"
echo "2. Update frontend/lib/contracts.ts with new ABIs"
echo "3. Update .env.local with new contract addresses"

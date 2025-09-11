#!/usr/bin/env bash

# Deployment script that avoids VS Code extension conflicts
echo "🚀 Deploying contracts..."

# Kill any existing Hardhat processes
pkill -f hardhat || true
sleep 1

# Set environment to avoid context conflicts
export NODE_OPTIONS="--max-old-space-size=4096"
export HARDHAT_RESET=true

# Use npx with ts-node directly for deployment
npx ts-node -e "
import hre from 'hardhat';
async function deploy() {
  try {
    await hre.run('run', { script: 'scripts/deploy.ts' });
    console.log('✅ Deployment successful!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Deployment failed:', err?.message || err);
    process.exit(1);
  }
}
deploy();
"

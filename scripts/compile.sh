#!/usr/bin/env bash

# Simple compilation script that avoids VS Code extension conflicts
echo "🔨 Compiling Solidity contracts..."

# Kill any existing Hardhat processes
pkill -f hardhat || true
sleep 1

# Set environment to avoid context conflicts
export NODE_OPTIONS="--max-old-space-size=4096"
export HARDHAT_RESET=true

# Use npx with ts-node directly
npx ts-node -e "
import hre from 'hardhat';
async function compile() {
  try {
    await hre.run('compile');
    console.log('✅ Compilation successful!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Compilation failed:', err?.message || err);
    process.exit(1);
  }
}
compile();
"

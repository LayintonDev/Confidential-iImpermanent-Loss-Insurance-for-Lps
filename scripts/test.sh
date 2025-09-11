#!/usr/bin/env bash

# Test script that avoids VS Code extension conflicts
echo "🧪 Running test suite..."

# Kill any existing Hardhat processes
pkill -f hardhat || true
sleep 1

# Set environment to avoid context conflicts
export NODE_OPTIONS="--max-old-space-size=4096"
export HARDHAT_RESET=true

# Use npx with ts-node directly for tests
npx ts-node -e "
import hre from 'hardhat';
async function runTests() {
  try {
    await hre.run('test');
    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Tests failed:', err?.message || err);
    process.exit(1);
  }
}
runTests();
"

#!/bin/bash

# Pure Foundry Build System
# Professional-grade development toolchain for Solidity projects

set -e

echo "⚒️  Pure Foundry Development Environment"
echo "========================================"

# Parse command line arguments
command=${1:-"help"}

case $command in
    "build"|"compile")
        echo "📦 Compiling contracts with Foundry..."
        forge build
        echo "✅ Compilation complete"
        ;;
    
    "test")
        echo "🧪 Running all tests..."
        shift # Remove first argument
        forge test "$@" # Pass remaining arguments to forge test
        ;;
    
    "test:verbose"|"test:v")
        echo "🧪 Running tests (verbose)..."
        forge test -vv
        ;;
    
    "test:gas")
        echo "⛽ Running tests with gas reports..."
        forge test --gas-report
        ;;
    
    "test:fuzz")
        echo "🎲 Running fuzz tests..."
        forge test --match-test "testFuzz" -vv
        ;;
    
    "test:specific")
        echo "🎯 Running specific test..."
        shift
        forge test --match-test "$1" -vvv
        ;;
    
    "test:coverage")
        echo "📊 Running test coverage analysis..."
        forge coverage
        ;;
    
    "node"|"anvil")
        echo "🌐 Starting Anvil local node..."
        pkill -f "anvil" || true
        anvil --host 0.0.0.0 --port 8545
        ;;
    
    "deploy")
        echo "🚀 Deploying contracts..."
        shift
        if [ -z "$1" ]; then
            echo "❌ Please specify a deploy script"
            echo "Usage: ./build.sh deploy <script_name> [--rpc-url <url>] [--private-key <key>]"
            exit 1
        fi
        forge script "$@"
        ;;
    
    "verify")
        echo "✅ Verifying contract..."
        shift
        forge verify-contract "$@"
        ;;
    
    "clean")
        echo "🧹 Cleaning build artifacts..."
        rm -rf out cache_forge lib/openzeppelin-contracts/.git
        echo "✅ Clean complete"
        ;;
    
    "install")
        echo "📥 Installing/updating dependencies..."
        forge install
        echo "✅ Dependencies updated"
        ;;
    
    "update")
        echo "🔄 Updating Foundry and dependencies..."
        foundryup
        forge update
        echo "✅ Updates complete"
        ;;
    
    "lint")
        echo "� Linting contracts..."
        forge fmt --check
        ;;
    
    "format"|"fmt")
        echo "✨ Formatting contracts..."
        forge fmt
        echo "✅ Formatting complete"
        ;;
    
    "size")
        echo "📏 Checking contract sizes..."
        forge build --sizes
        ;;
    
    "deps")
        echo "📋 Checking dependencies..."
        forge tree
        ;;
    
    "status")
        echo "📊 Project Status:"
        echo "=================="
        echo "Foundry version: $(forge --version | head -n1)"
        echo "Cast version: $(cast --version)"
        echo "Anvil version: $(anvil --version)"
        echo ""
        echo "📁 Project Structure:"
        echo "  - Source: contracts/"
        echo "  - Tests: test/"
        echo "  - Output: out/"
        echo "  - Cache: cache_forge/"
        echo "  - Libraries: lib/"
        echo ""
        if [ -d "out" ]; then
            echo "🔨 Contracts compiled: $(find out -name "*.json" | wc -l)"
        fi
        if [ -d "test" ]; then
            echo "🧪 Test files: $(find test -name "*.t.sol" | wc -l)"
        fi
        if [ -d "lib" ]; then
            echo "� Libraries: $(find lib -maxdepth 1 -type d | tail -n +2 | wc -l)"
        fi
        ;;
    
    "init:test")
        echo "🧪 Creating new test file..."
        if [ -z "$2" ]; then
            echo "❌ Please specify test name"
            echo "Usage: ./build.sh init:test <TestName>"
            exit 1
        fi
        
        test_name="$2"
        test_file="test/${test_name}.t.sol"
        
        cat > "$test_file" << EOF
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console} from "forge-std/Test.sol";

/**
 * @title ${test_name}Test
 * @notice Test suite for ${test_name}
 */
contract ${test_name}Test is Test {
    function setUp() public {
        // Setup test environment
    }
    
    function testExample() public {
        // Write your test here
        assertTrue(true);
    }
}
EOF
        echo "✅ Created test file: $test_file"
        ;;
    
    "help"|*)
        echo "Usage: ./build.sh <command>"
        echo ""
        echo "🔨 Build Commands:"
        echo "  build, compile        - Compile all contracts"
        echo "  clean                - Clean build artifacts"
        echo "  size                 - Check contract sizes"
        echo "  lint                 - Check code formatting"
        echo "  format, fmt          - Format code"
        echo ""
        echo "🧪 Testing Commands:"
        echo "  test                 - Run all tests"
        echo "  test:verbose, test:v - Run tests with verbose output"
        echo "  test:gas            - Run tests with gas reports"
        echo "  test:fuzz           - Run only fuzz tests"
        echo "  test:specific <name> - Run specific test"
        echo "  test:coverage       - Run coverage analysis"
        echo ""
        echo "🚀 Deployment Commands:"
        echo "  deploy <script>     - Deploy using forge script"
        echo "  verify <args>       - Verify contract on Etherscan"
        echo ""
        echo "🛠️  Development Commands:"
        echo "  node, anvil         - Start local Anvil node"
        echo "  install            - Install dependencies"
        echo "  update             - Update Foundry and dependencies"
        echo "  deps               - Show dependency tree"
        echo "  status             - Show project status"
        echo ""
        echo "🎯 Utilities:"
        echo "  init:test <name>   - Create new test file"
        echo "  help               - Show this help"
        echo ""
        echo "Examples:"
        echo "  ./build.sh test:verbose"
        echo "  ./build.sh deploy script/Deploy.s.sol --rpc-url anvil"
        echo "  ./build.sh test:specific testPolicyMinting"
        echo "  ./build.sh init:test FeeSplitter"
        ;;
esac

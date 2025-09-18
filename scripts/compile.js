#!/usr/bin/env node

/**
 * Standalone compilation script to avoid Hardhat context conflicts
 * This bypasses the VS Code Hardhat extension issues
 */

const { spawn } = require("child_process");
const path = require("path");

async function compileContracts() {
  return new Promise((resolve, reject) => {
    console.log("🔨 Compiling Solidity contracts...");

    // Use a fresh Node.js process to avoid context conflicts
    const hardhatProcess = spawn(
      "node",
      [
        "-e",
        `
      process.env.HARDHAT_RESET = 'true';
      delete require.cache[require.resolve('hardhat/config')];
      const hre = require('hardhat');
      hre.run('compile').then(() => {
        console.log('✅ Compilation successful!');
        process.exit(0);
      }).catch(err => {
        console.error('❌ Compilation failed:', err.message);
        process.exit(1);
      });
      `,
      ],
      {
        stdio: "inherit",
        cwd: process.cwd(),
      }
    );

    hardhatProcess.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Compilation failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    await compileContracts();
    console.log("🎉 All contracts compiled successfully!");
  } catch (error) {
    console.error("💥 Compilation error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { compileContracts };

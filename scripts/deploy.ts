import hre from "hardhat";

const { ethers } = hre;

async function main() {
  console.log("🚀 Starting deployment of Confidential IL Insurance Hook contracts...");

  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy FhenixComputeProxy first
  console.log("\n📦 Deploying FhenixComputeProxy...");
  const FhenixComputeProxy = await ethers.getContractFactory("FhenixComputeProxy");
  const fhenixProxy = await FhenixComputeProxy.deploy();
  await fhenixProxy.waitForDeployment();
  const fhenixProxyAddress = await fhenixProxy.getAddress();
  console.log("✅ FhenixComputeProxy deployed to:", fhenixProxyAddress);

  // Deploy InsuranceVault
  console.log("\n📦 Deploying InsuranceVault...");
  const InsuranceVault = await ethers.getContractFactory("InsuranceVault");
  const insuranceVault = await InsuranceVault.deploy(deployer.address);
  await insuranceVault.waitForDeployment();
  const vaultAddress = await insuranceVault.getAddress();
  console.log("✅ InsuranceVault deployed to:", vaultAddress);

  // Deploy PayoutVault
  console.log("\n📦 Deploying PayoutVault...");
  const PayoutVault = await ethers.getContractFactory("PayoutVault");
  const payoutVault = await PayoutVault.deploy(vaultAddress);
  await payoutVault.waitForDeployment();
  const payoutVaultAddress = await payoutVault.getAddress();
  console.log("✅ PayoutVault deployed to:", payoutVaultAddress);

  // Deploy EigenAVSManager
  console.log("\n📦 Deploying EigenAVSManager...");
  const EigenAVSManager = await ethers.getContractFactory("EigenAVSManager");
  const eigenAVS = await EigenAVSManager.deploy(
    vaultAddress,
    fhenixProxyAddress,
    ethers.parseEther("1"), // 1 ETH minimum stake
    3 // 3-of-5 threshold
  );
  await eigenAVS.waitForDeployment();
  const eigenAVSAddress = await eigenAVS.getAddress();
  console.log("✅ EigenAVSManager deployed to:", eigenAVSAddress);

  // Deploy ConfidentialILHook (we'll need to create a PolicyManager first, but for now use a placeholder)
  console.log("\n📦 Deploying ConfidentialILHook...");
  const ConfidentialILHook = await ethers.getContractFactory("ConfidentialILHook");
  const hook = await ConfidentialILHook.deploy(
    deployer.address, // Placeholder for PolicyManager
    vaultAddress,
    deployer.address // Placeholder for FeeSplitter
  );
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("✅ ConfidentialILHook deployed to:", hookAddress);

  // Configure access controls
  console.log("\n🔐 Setting up access controls...");

  // Grant HOOK_ROLE to the ConfidentialILHook
  await insuranceVault.grantHookRole(hookAddress);
  console.log("✅ Granted HOOK_ROLE to ConfidentialILHook");

  // Grant AVS_ROLE to the EigenAVSManager
  await insuranceVault.grantAVSRole(eigenAVSAddress);
  console.log("✅ Granted AVS_ROLE to EigenAVSManager");

  // Authorize a mock Fhenix worker (deployer for testing)
  await fhenixProxy.authorizeWorker(deployer.address, "mock-worker-1");
  console.log("✅ Authorized mock Fhenix worker");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("=====================================");
  console.log("ConfidentialILHook:    ", hookAddress);
  console.log("InsuranceVault:        ", vaultAddress);
  console.log("PayoutVault:           ", payoutVaultAddress);
  console.log("EigenAVSManager:       ", eigenAVSAddress);
  console.log("FhenixComputeProxy:    ", fhenixProxyAddress);
  console.log("=====================================");

  // Save addresses to a file for frontend use
  const addresses = {
    ConfidentialILHook: hookAddress,
    InsuranceVault: vaultAddress,
    PayoutVault: payoutVaultAddress,
    EigenAVSManager: eigenAVSAddress,
    FhenixComputeProxy: fhenixProxyAddress,
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
  };

  console.log("\n💾 Contract addresses saved for frontend integration");

  return addresses;
}

main().catch(error => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

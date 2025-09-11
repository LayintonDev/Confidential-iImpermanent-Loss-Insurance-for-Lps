import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Phase 2 contracts...");

  // Get signers
  const [deployer, user1] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Deploy PolicyManager
  console.log("\n📋 Deploying PolicyManager...");
  const PolicyManager = await ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy(deployer.address, "https://metadata.confidential-il.com/policy/");
  await policyManager.waitForDeployment();
  console.log("PolicyManager deployed to:", await policyManager.getAddress());

  // 2. Deploy InsuranceVault
  console.log("\n🏦 Deploying InsuranceVault...");
  const InsuranceVault = await ethers.getContractFactory("InsuranceVault");
  const insuranceVault = await InsuranceVault.deploy(deployer.address);
  await insuranceVault.waitForDeployment();
  console.log("InsuranceVault deployed to:", await insuranceVault.getAddress());

  // 3. Deploy FeeSplitter
  console.log("\n💰 Deploying FeeSplitter...");
  const FeeSplitter = await ethers.getContractFactory("FeeSplitter");
  const feeSplitter = await FeeSplitter.deploy(deployer.address, await insuranceVault.getAddress());
  await feeSplitter.waitForDeployment();
  console.log("FeeSplitter deployed to:", await feeSplitter.getAddress());

  // 4. Deploy ConfidentialILHook
  console.log("\n🪝 Deploying ConfidentialILHook...");
  const ConfidentialILHook = await ethers.getContractFactory("ConfidentialILHook");
  const hook = await ConfidentialILHook.deploy(
    await policyManager.getAddress(),
    await insuranceVault.getAddress(),
    await feeSplitter.getAddress(),
    deployer.address
  );
  await hook.waitForDeployment();
  console.log("ConfidentialILHook deployed to:", await hook.getAddress());

  // 5. Setup roles
  console.log("\n🔐 Setting up roles...");
  const HOOK_ROLE = await policyManager.HOOK_ROLE();
  await policyManager.grantRole(HOOK_ROLE, await hook.getAddress());
  console.log("✅ Granted HOOK_ROLE to hook in PolicyManager");

  await insuranceVault.grantRole(await insuranceVault.HOOK_ROLE(), await hook.getAddress());
  console.log("✅ Granted HOOK_ROLE to hook in InsuranceVault");

  await feeSplitter.grantRole(await feeSplitter.HOOK_ROLE(), await hook.getAddress());
  console.log("✅ Granted HOOK_ROLE to hook in FeeSplitter");

  // 6. Test basic functionality
  console.log("\n🧪 Testing basic functionality...");

  // Whitelist a mock pool
  const mockPool = ethers.Wallet.createRandom().address;
  await hook.whitelistPool(mockPool);
  console.log("✅ Whitelisted mock pool:", mockPool);

  // Test policy creation
  const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-entry-data"));
  const params = {
    deductibleBps: 1000, // 10%
    capBps: 5000, // 50%
    premiumBps: 3, // 0.03%
    duration: 100000, // ~2 weeks
    pool: mockPool,
  };

  const tx = await policyManager.mintPolicy(user1.address, mockPool, params, entryCommit);
  const receipt = await tx.wait();
  console.log("✅ Minted policy NFT for user1");

  // Get policy details
  const policyId = 1;
  const policy = await policyManager.getPolicy(policyId);
  console.log("Policy details:", {
    lp: policy.lp,
    pool: policy.pool,
    active: policy.active,
    deductibleBps: policy.params.deductibleBps.toString(),
    capBps: policy.params.capBps.toString(),
    premiumBps: policy.params.premiumBps.toString(),
  });

  // Test fee splitter initialization
  await feeSplitter.initializePool(mockPool, 1000, 2000);
  console.log("✅ Initialized fee tracking for pool");

  // Test premium extraction
  const extractTx = await feeSplitter.extractPremium(mockPool, 1500, 2500);
  await extractTx.wait();
  console.log("✅ Extracted premium from mock fees");

  // Test hook integration
  const hookData = "0x01"; // Insurance enabled
  const addLiquidityTx = await hook.afterAddLiquidity(
    mockPool,
    user1.address,
    ethers.parseEther("1"),
    ethers.parseEther("2"),
    hookData
  );
  await addLiquidityTx.wait();
  console.log("✅ Tested afterAddLiquidity hook");

  const swapTx = await hook.afterSwap(mockPool, 2000, 3000, "0x");
  await swapTx.wait();
  console.log("✅ Tested afterSwap hook");

  console.log("\n🎉 Phase 2 deployment and testing completed successfully!");
  console.log("\nContract Addresses:");
  console.log("==================");
  console.log("PolicyManager:", await policyManager.getAddress());
  console.log("InsuranceVault:", await insuranceVault.getAddress());
  console.log("FeeSplitter:", await feeSplitter.getAddress());
  console.log("ConfidentialILHook:", await hook.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

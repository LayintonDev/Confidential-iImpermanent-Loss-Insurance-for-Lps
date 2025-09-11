import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";

const { ethers } = hre;

describe("Phase 2: Policy & Vault Implementation Tests", function () {
  // Test fixture for deploying Phase 2 contracts
  async function deployPhase2Fixture() {
    // Get signers
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy PolicyManager
    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    const policyManager = await PolicyManager.deploy(owner.address, "https://metadata.confidential-il.com/policy/");

    // Deploy InsuranceVault
    const InsuranceVault = await ethers.getContractFactory("InsuranceVault");
    const insuranceVault = await InsuranceVault.deploy(owner.address);

    // Deploy FeeSplitter
    const FeeSplitter = await ethers.getContractFactory("FeeSplitter");
    const feeSplitter = await FeeSplitter.deploy(owner.address, await insuranceVault.getAddress());

    // Deploy ConfidentialILHook
    const ConfidentialILHook = await ethers.getContractFactory("ConfidentialILHook");
    const hook = await ConfidentialILHook.deploy(
      await policyManager.getAddress(),
      await insuranceVault.getAddress(),
      await feeSplitter.getAddress(),
      owner.address
    );

    // Setup roles
    const HOOK_ROLE = await policyManager.HOOK_ROLE();
    await policyManager.grantRole(HOOK_ROLE, await hook.getAddress());
    await insuranceVault.grantRole(await insuranceVault.HOOK_ROLE(), await hook.getAddress());
    await feeSplitter.grantRole(await feeSplitter.HOOK_ROLE(), await hook.getAddress());

    // Mock pool address
    const mockPool = ethers.Wallet.createRandom().address;

    return {
      owner,
      user1,
      user2,
      user3,
      policyManager,
      insuranceVault,
      feeSplitter,
      hook,
      mockPool,
    };
  }

  describe("PolicyManager Tests", function () {
    it("Should deploy PolicyManager with correct initial parameters", async function () {
      const { policyManager, owner } = await loadFixture(deployPhase2Fixture);

      expect(await policyManager.currentPolicyId()).to.equal(1);
      expect(await policyManager.hasRole(await policyManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;

      const defaultParams = await policyManager.defaultParams();
      expect(defaultParams.deductibleBps).to.equal(1000); // 10%
      expect(defaultParams.capBps).to.equal(5000); // 50%
      expect(defaultParams.premiumBps).to.equal(3); // 0.03%
    });

    it("Should mint a policy NFT successfully", async function () {
      const { policyManager, hook, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // Hook should be able to mint policy
      await expect(policyManager.connect(hook).mintPolicy(user1.address, mockPool, params, entryCommit)).to.emit(
        policyManager,
        "PolicyCreated"
      );

      // Check policy was created
      const policyId = 1;
      const policy = await policyManager.getPolicy(policyId);
      expect(policy.lp).to.equal(user1.address);
      expect(policy.pool).to.equal(mockPool);
      expect(policy.active).to.be.true;

      // Check NFT was minted
      expect(await policyManager.balanceOf(user1.address, policyId)).to.equal(1);
      expect(await policyManager.ownerOfPolicy(policyId)).to.equal(user1.address);
    });

    it("Should track policies by LP and pool", async function () {
      const { policyManager, hook, user1, user2, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // Mint policies for different users
      await policyManager.connect(hook).mintPolicy(user1.address, mockPool, params, entryCommit);
      await policyManager.connect(hook).mintPolicy(user2.address, mockPool, params, entryCommit);

      // Check policy tracking
      const user1Policies = await policyManager.getPoliciesByLP(user1.address);
      const user2Policies = await policyManager.getPoliciesByLP(user2.address);
      const poolPolicies = await policyManager.getPoliciesByPool(mockPool);

      expect(user1Policies.length).to.equal(1);
      expect(user2Policies.length).to.equal(1);
      expect(poolPolicies.length).to.equal(2);
    });

    it("Should burn policy correctly", async function () {
      const { policyManager, hook, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // Mint policy
      await policyManager.connect(hook).mintPolicy(user1.address, mockPool, params, entryCommit);
      const policyId = 1;

      // LP should be able to burn their own policy
      await expect(policyManager.connect(user1).burnPolicy(policyId)).to.emit(policyManager, "PolicyBurned");

      // Check policy is inactive
      const policy = await policyManager.getPolicy(policyId);
      expect(policy.active).to.be.false;

      // Check NFT was burned
      expect(await policyManager.balanceOf(user1.address, policyId)).to.equal(0);
    });

    it("Should check policy active status correctly", async function () {
      const { policyManager, hook, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100, // Short duration for testing
        pool: mockPool,
      };

      // Mint policy with short duration
      await policyManager.connect(hook).mintPolicy(user1.address, mockPool, params, entryCommit);
      const policyId = 1;

      // Should be active initially
      expect(await policyManager.isPolicyActive(policyId)).to.be.true;

      // Mine blocks to expire policy
      for (let i = 0; i < 110; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Should be inactive after expiration
      expect(await policyManager.isPolicyActive(policyId)).to.be.false;
    });
  });

  describe("FeeSplitter Tests", function () {
    it("Should initialize pool correctly", async function () {
      const { feeSplitter, hook, mockPool } = await loadFixture(deployPhase2Fixture);

      await feeSplitter.connect(hook).initializePool(mockPool, 1000, 2000);

      expect(await feeSplitter.poolInitialized(mockPool)).to.be.true;
      expect(await feeSplitter.lastFeeGrowthGlobal0(mockPool)).to.equal(1000);
      expect(await feeSplitter.lastFeeGrowthGlobal1(mockPool)).to.equal(2000);
      expect(await feeSplitter.getPremiumRate(mockPool)).to.equal(3); // Default rate
    });

    it("Should extract premium correctly", async function () {
      const { feeSplitter, hook, mockPool } = await loadFixture(deployPhase2Fixture);

      // Initialize pool
      await feeSplitter.connect(hook).initializePool(mockPool, 1000, 2000);

      // Extract premium with new fee growth
      await expect(feeSplitter.connect(hook).extractPremium(mockPool, 1500, 2500)).to.emit(
        feeSplitter,
        "PremiumExtracted"
      );

      // Check fee growth was updated
      expect(await feeSplitter.lastFeeGrowthGlobal0(mockPool)).to.equal(1500);
      expect(await feeSplitter.lastFeeGrowthGlobal1(mockPool)).to.equal(2500);
    });

    it("Should estimate premium correctly", async function () {
      const { feeSplitter, hook, mockPool } = await loadFixture(deployPhase2Fixture);

      // Initialize pool
      await feeSplitter.connect(hook).initializePool(mockPool, 1000, 2000);

      // Estimate premium
      const estimatedPremium = await feeSplitter.estimatePremium(mockPool, 1500, 2500);

      // Should calculate: ((500 + 500) / 2) * 3 / 10000 = 0.15
      expect(estimatedPremium).to.equal(0); // Rounds down for small amounts
    });
  });

  describe("Hook Integration Tests", function () {
    it("Should whitelist pool correctly", async function () {
      const { hook, owner, mockPool } = await loadFixture(deployPhase2Fixture);

      await hook.connect(owner).whitelistPool(mockPool);
      expect(await hook.whitelistedPools(mockPool)).to.be.true;
    });

    it("Should create policy on afterAddLiquidity", async function () {
      const { hook, policyManager, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // Whitelist pool first
      await hook.whitelistPool(mockPool);

      // Prepare hook data with insurance enabled
      const insuranceEnabled = "0x01"; // Insurance enabled flag
      const deductibleBps = ethers.zeroPadValue(ethers.toBeHex(1000), 4);
      const capBps = ethers.zeroPadValue(ethers.toBeHex(5000), 4);
      const premiumBps = ethers.zeroPadValue(ethers.toBeHex(3), 4);
      const hookData = insuranceEnabled + deductibleBps.slice(2) + capBps.slice(2) + premiumBps.slice(2);

      // Call afterAddLiquidity
      await expect(
        hook.afterAddLiquidity(mockPool, user1.address, ethers.parseEther("1"), ethers.parseEther("2"), hookData)
      ).to.emit(hook, "PolicyCreated");

      // Check policy was created
      const policies = await policyManager.getPoliciesByLP(user1.address);
      expect(policies.length).to.equal(1);
    });

    it("Should skip policy creation when insurance not enabled", async function () {
      const { hook, policyManager, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // Whitelist pool first
      await hook.whitelistPool(mockPool);

      // Prepare hook data without insurance enabled
      const hookData = "0x00"; // Insurance disabled

      // Call afterAddLiquidity
      await hook.afterAddLiquidity(mockPool, user1.address, ethers.parseEther("1"), ethers.parseEther("2"), hookData);

      // Check no policy was created
      const policies = await policyManager.getPoliciesByLP(user1.address);
      expect(policies.length).to.equal(0);
    });

    it("Should emit ClaimRequested on beforeRemoveLiquidity", async function () {
      const { hook, policyManager, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // First create a policy
      await hook.whitelistPool(mockPool);
      const hookData = "0x01" + "000003e8" + "00001388" + "00000003"; // Insurance enabled with params

      await hook.afterAddLiquidity(mockPool, user1.address, ethers.parseEther("1"), ethers.parseEther("2"), hookData);

      const policyId = 1;

      // Call beforeRemoveLiquidity
      await expect(hook.beforeRemoveLiquidity(mockPool, policyId, "0x")).to.emit(hook, "ClaimRequested");
    });

    it("Should extract premium on afterSwap", async function () {
      const { hook, feeSplitter, mockPool } = await loadFixture(deployPhase2Fixture);

      // Whitelist pool
      await hook.whitelistPool(mockPool);

      // Call afterSwap
      await expect(hook.afterSwap(mockPool, 1500, 2500, "0x")).to.emit(feeSplitter, "PremiumExtracted");
    });
  });

  describe("Access Control Tests", function () {
    it("Should restrict minting to hook role", async function () {
      const { policyManager, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // User should not be able to mint directly
      await expect(
        policyManager.connect(user1).mintPolicy(user1.address, mockPool, params, entryCommit)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should restrict premium extraction to hook role", async function () {
      const { feeSplitter, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // User should not be able to extract premium directly
      await expect(feeSplitter.connect(user1).extractPremium(mockPool, 1500, 2500)).to.be.revertedWith(
        "AccessControl:"
      );
    });

    it("Should restrict admin functions", async function () {
      const { hook, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // User should not be able to whitelist pools
      await expect(hook.connect(user1).whitelistPool(mockPool)).to.be.revertedWith("AccessControl:");
    });
  });
});

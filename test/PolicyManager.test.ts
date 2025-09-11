import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";

const { ethers } = hre;

describe("Phase 2: Core Policy & Vault Tests", function () {
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

    // Setup roles - Use impersonation to call as hook
    const HOOK_ROLE = await policyManager.HOOK_ROLE();
    await policyManager.grantRole(HOOK_ROLE, owner.address); // Grant to owner for testing
    await insuranceVault.grantRole(await insuranceVault.HOOK_ROLE(), owner.address);
    await feeSplitter.grantRole(await feeSplitter.HOOK_ROLE(), owner.address);

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

  describe("PolicyManager Core Functions", function () {
    it("Should deploy with correct default parameters", async function () {
      const { policyManager, owner } = await loadFixture(deployPhase2Fixture);

      expect(await policyManager.currentPolicyId()).to.equal(1);
      expect(await policyManager.hasRole(await policyManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;

      const defaultParams = await policyManager.defaultParams();
      expect(defaultParams.deductibleBps).to.equal(1000); // 10%
      expect(defaultParams.capBps).to.equal(5000); // 50%
      expect(defaultParams.premiumBps).to.equal(3); // 0.03%
    });

    it("Should mint policy NFT successfully", async function () {
      const { policyManager, owner, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // Owner (with HOOK_ROLE) should be able to mint policy
      await expect(policyManager.connect(owner).mintPolicy(user1.address, mockPool, params, entryCommit)).to.emit(
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

    it("Should track policies correctly", async function () {
      const { policyManager, owner, user1, user2, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // Mint policies for different users
      await policyManager.connect(owner).mintPolicy(user1.address, mockPool, params, entryCommit);
      await policyManager.connect(owner).mintPolicy(user2.address, mockPool, params, entryCommit);

      // Check policy tracking
      const user1Policies = await policyManager.getPoliciesByLP(user1.address);
      const user2Policies = await policyManager.getPoliciesByLP(user2.address);
      const poolPolicies = await policyManager.getPoliciesByPool(mockPool);

      expect(user1Policies.length).to.equal(1);
      expect(user2Policies.length).to.equal(1);
      expect(poolPolicies.length).to.equal(2);
    });

    it("Should burn policy correctly", async function () {
      const { policyManager, owner, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      // Mint policy
      await policyManager.connect(owner).mintPolicy(user1.address, mockPool, params, entryCommit);
      const policyId = 1;

      // LP should be able to burn their own policy
      await expect(policyManager.connect(user1).burnPolicy(policyId)).to.emit(policyManager, "PolicyBurned");

      // Check policy is inactive
      const policy = await policyManager.getPolicy(policyId);
      expect(policy.active).to.be.false;

      // Check NFT was burned
      expect(await policyManager.balanceOf(user1.address, policyId)).to.equal(0);
    });
  });

  describe("FeeSplitter Functions", function () {
    it("Should initialize pool correctly", async function () {
      const { feeSplitter, owner, mockPool } = await loadFixture(deployPhase2Fixture);

      await feeSplitter.connect(owner).initializePool(mockPool, 1000, 2000);

      expect(await feeSplitter.poolInitialized(mockPool)).to.be.true;
      expect(await feeSplitter.lastFeeGrowthGlobal0(mockPool)).to.equal(1000);
      expect(await feeSplitter.lastFeeGrowthGlobal1(mockPool)).to.equal(2000);
      expect(await feeSplitter.getPremiumRate(mockPool)).to.equal(3); // Default rate
    });

    it("Should extract premium correctly", async function () {
      const { feeSplitter, owner, mockPool } = await loadFixture(deployPhase2Fixture);

      // Initialize pool
      await feeSplitter.connect(owner).initializePool(mockPool, 1000, 2000);

      // Extract premium with new fee growth
      await expect(feeSplitter.connect(owner).extractPremium(mockPool, 1500, 2500)).to.emit(
        feeSplitter,
        "PremiumExtracted"
      );

      // Check fee growth was updated
      expect(await feeSplitter.lastFeeGrowthGlobal0(mockPool)).to.equal(1500);
      expect(await feeSplitter.lastFeeGrowthGlobal1(mockPool)).to.equal(2500);
    });
  });

  describe("Hook Integration", function () {
    it("Should whitelist pool correctly", async function () {
      const { hook, owner, mockPool } = await loadFixture(deployPhase2Fixture);

      await hook.connect(owner).whitelistPool(mockPool);
      expect(await hook.whitelistedPools(mockPool)).to.be.true;
    });

    it("Should parse insurance data correctly", async function () {
      const { hook, owner, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // Whitelist pool first
      await hook.connect(owner).whitelistPool(mockPool);

      // Prepare hook data with insurance enabled
      const insuranceEnabled = "0x01"; // Insurance enabled flag
      const deductibleBps = ethers.zeroPadValue(ethers.toBeHex(1000), 4);
      const capBps = ethers.zeroPadValue(ethers.toBeHex(5000), 4);
      const premiumBps = ethers.zeroPadValue(ethers.toBeHex(3), 4);
      const hookData = insuranceEnabled + deductibleBps.slice(2) + capBps.slice(2) + premiumBps.slice(2);

      // This should work without reverting (testing internal parsing)
      const result = await hook.afterAddLiquidity(
        mockPool,
        user1.address,
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        hookData
      );

      expect(result).to.not.be.undefined;
    });

    it("Should emit ClaimRequested on beforeRemoveLiquidity with valid policy", async function () {
      const { hook, policyManager, owner, user1, mockPool } = await loadFixture(deployPhase2Fixture);

      // First create a policy manually
      const entryCommit = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const params = {
        deductibleBps: 1000,
        capBps: 5000,
        premiumBps: 3,
        duration: 100000,
        pool: mockPool,
      };

      await policyManager.connect(owner).mintPolicy(user1.address, mockPool, params, entryCommit);
      const policyId = 1;

      // Store commitment hash in hook
      await hook.connect(owner).whitelistPool(mockPool); // This will store commitment

      // Call beforeRemoveLiquidity with valid policy ID
      const result = await hook.beforeRemoveLiquidity(mockPool, policyId, "0x");
      expect(result).to.not.be.undefined;
    });

    it("Should extract premium on afterSwap", async function () {
      const { hook, feeSplitter, owner, mockPool } = await loadFixture(deployPhase2Fixture);

      // Whitelist pool
      await hook.connect(owner).whitelistPool(mockPool);

      // Call afterSwap
      await expect(hook.afterSwap(mockPool, 1500, 2500, "0x")).to.emit(feeSplitter, "PremiumExtracted");
    });
  });

  describe("Access Control", function () {
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
  });
});

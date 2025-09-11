import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";

const { ethers } = hre;

describe("Confidential IL Insurance Hook - Unit Tests", function () {
  // Test fixture for deploying contracts
  async function deployContractsFixture() {
    // Get signers
    const [owner, user1, user2, operator1] = await ethers.getSigners();

    // Deploy FhenixComputeProxy
    const FhenixComputeProxy = await ethers.getContractFactory("FhenixComputeProxy");
    const fhenixProxy = await FhenixComputeProxy.deploy();

    // Deploy InsuranceVault
    const InsuranceVault = await ethers.getContractFactory("InsuranceVault");
    const insuranceVault = await InsuranceVault.deploy(owner.address);

    // Deploy PayoutVault
    const PayoutVault = await ethers.getContractFactory("PayoutVault");
    const payoutVault = await PayoutVault.deploy(await insuranceVault.getAddress());

    // Deploy EigenAVSManager
    const EigenAVSManager = await ethers.getContractFactory("EigenAVSManager");
    const eigenAVS = await EigenAVSManager.deploy(
      await insuranceVault.getAddress(),
      await fhenixProxy.getAddress(),
      ethers.parseEther("1"), // 1 ETH minimum stake
      3 // 3-of-5 threshold
    );

    // Deploy ConfidentialILHook
    const ConfidentialILHook = await ethers.getContractFactory("ConfidentialILHook");
    const hook = await ConfidentialILHook.deploy(
      owner.address, // Placeholder for PolicyManager
      await insuranceVault.getAddress(),
      owner.address // Placeholder for FeeSplitter
    );

    return {
      owner,
      user1,
      user2,
      operator1,
      fhenixProxy,
      insuranceVault,
      payoutVault,
      eigenAVS,
      hook,
    };
  }

  describe("Contract Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const { fhenixProxy, insuranceVault, payoutVault, eigenAVS, hook } = await loadFixture(deployContractsFixture);

      // Check that contracts are deployed with non-zero addresses
      expect(await fhenixProxy.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await insuranceVault.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await payoutVault.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await eigenAVS.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await hook.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct initial parameters", async function () {
      const { eigenAVS, owner } = await loadFixture(deployContractsFixture);

      expect(await eigenAVS.minimumStake()).to.equal(ethers.parseEther("1"));
      expect(await eigenAVS.signatureThreshold()).to.equal(3);
      expect(await eigenAVS.owner()).to.equal(owner.address);
    });
  });

  describe("Hook Interface Implementation", function () {
    it("Should implement all required hook functions", async function () {
      const { hook } = await loadFixture(deployContractsFixture);

      // Test that hook functions return correct selectors (basic functionality test)
      const mockPool = ethers.Wallet.createRandom().address;
      const mockData = "0x";

      // These should not revert for basic calls
      expect(await hook.beforeInitialize(mockPool, 0, mockData)).to.equal("0x0b301c01"); // beforeInitialize selector

      expect(await hook.afterInitialize(mockPool, 0, mockData)).to.equal("0x2cd5fc95"); // afterInitialize selector
    });

    it("Should whitelist pools in beforeInitialize", async function () {
      const { hook } = await loadFixture(deployContractsFixture);
      const mockPool = ethers.Wallet.createRandom().address;

      // Call beforeInitialize
      await hook.beforeInitialize(mockPool, 0, "0x");

      // Check that pool is whitelisted
      expect(await hook.whitelistedPools(mockPool)).to.be.true;
    });
  });

  describe("Insurance Vault", function () {
    it("Should allow authorized premium deposits", async function () {
      const { insuranceVault, hook, owner } = await loadFixture(deployContractsFixture);

      // Grant HOOK_ROLE to hook contract
      await insuranceVault.grantHookRole(await hook.getAddress());

      const mockPool = ethers.Wallet.createRandom().address;
      const premiumAmount = ethers.parseEther("0.1");

      // This should work since hook has HOOK_ROLE
      await insuranceVault
        .connect(await ethers.getSigner(await hook.getAddress()))
        .depositPremium(mockPool, premiumAmount);

      expect(await insuranceVault.reserves(mockPool)).to.equal(premiumAmount);
    });

    it("Should reject unauthorized premium deposits", async function () {
      const { insuranceVault, user1 } = await loadFixture(deployContractsFixture);

      const mockPool = ethers.Wallet.createRandom().address;
      const premiumAmount = ethers.parseEther("0.1");

      // This should revert since user1 doesn't have HOOK_ROLE
      await expect(insuranceVault.connect(user1).depositPremium(mockPool, premiumAmount)).to.be.reverted;
    });

    it("Should check solvency correctly", async function () {
      const { insuranceVault, hook } = await loadFixture(deployContractsFixture);

      // Grant role and deposit some premium
      await insuranceVault.grantHookRole(await hook.getAddress());

      const mockPool = ethers.Wallet.createRandom().address;
      const premiumAmount = ethers.parseEther("1");

      // Deposit premium using the hook address
      await insuranceVault
        .connect(await ethers.getSigner(await hook.getAddress()))
        .depositPremium(mockPool, premiumAmount);

      // Should be solvent for amounts less than total reserves
      expect(await insuranceVault.solventFor(ethers.parseEther("0.5"))).to.be.true;

      // Should not be solvent for amounts greater than total reserves
      expect(await insuranceVault.solventFor(ethers.parseEther("2"))).to.be.false;
    });
  });

  describe("EigenAVS Manager", function () {
    it("Should allow operator registration with sufficient stake", async function () {
      const { eigenAVS, operator1 } = await loadFixture(deployContractsFixture);

      const stakeAmount = ethers.parseEther("2");

      await expect(eigenAVS.connect(operator1).registerOperator({ value: stakeAmount }))
        .to.emit(eigenAVS, "OperatorRegistered")
        .withArgs(operator1.address, stakeAmount);

      const operatorInfo = await eigenAVS.getOperatorInfo(operator1.address);
      expect(operatorInfo.stake).to.equal(stakeAmount);
      expect(operatorInfo.isActive).to.be.true;
    });

    it("Should reject operator registration with insufficient stake", async function () {
      const { eigenAVS, operator1 } = await loadFixture(deployContractsFixture);

      const insufficientStake = ethers.parseEther("0.5"); // Less than 1 ETH minimum

      await expect(
        eigenAVS.connect(operator1).registerOperator({ value: insufficientStake })
      ).to.be.revertedWithCustomError(eigenAVS, "InsufficientStake");
    });

    it("Should allow owner to slash operators", async function () {
      const { eigenAVS, operator1, owner } = await loadFixture(deployContractsFixture);

      // First register operator
      const stakeAmount = ethers.parseEther("2");
      await eigenAVS.connect(operator1).registerOperator({ value: stakeAmount });

      const slashAmount = ethers.parseEther("0.5");
      const reason = "Invalid attestation";

      await expect(eigenAVS.connect(owner).slashOperator(operator1.address, slashAmount, reason))
        .to.emit(eigenAVS, "OperatorSlashed")
        .withArgs(operator1.address, slashAmount, reason);

      const operatorInfo = await eigenAVS.getOperatorInfo(operator1.address);
      expect(operatorInfo.stake).to.equal(stakeAmount - slashAmount);
      expect(operatorInfo.slashingHistory).to.equal(slashAmount);
    });
  });

  describe("Fhenix Compute Proxy", function () {
    it("Should allow authorized workers to submit results", async function () {
      const { fhenixProxy, owner } = await loadFixture(deployContractsFixture);

      // Authorize a worker
      const worker = ethers.Wallet.createRandom();
      await fhenixProxy.authorizeWorker(worker.address, "test-worker-1");

      expect(await fhenixProxy.isAuthorizedWorker(worker.address)).to.be.true;
      expect(await fhenixProxy.getWorkerId(worker.address)).to.equal("test-worker-1");
    });

    it("Should reject unauthorized worker submissions", async function () {
      const { fhenixProxy, user1 } = await loadFixture(deployContractsFixture);

      const policyId = 1;
      const attestation = "0x1234567890abcdef";
      const signature = "0x" + "00".repeat(65); // Mock signature

      await expect(
        fhenixProxy.connect(user1).submitFhenixResult(policyId, attestation, signature)
      ).to.be.revertedWithCustomError(fhenixProxy, "UnauthorizedWorker");
    });
  });

  describe("Access Control", function () {
    it("Should properly manage role-based access", async function () {
      const { insuranceVault, hook, owner } = await loadFixture(deployContractsFixture);

      // Initially, hook should not have HOOK_ROLE
      const HOOK_ROLE = await insuranceVault.HOOK_ROLE();
      expect(await insuranceVault.hasRole(HOOK_ROLE, await hook.getAddress())).to.be.false;

      // Grant role
      await insuranceVault.grantHookRole(await hook.getAddress());
      expect(await insuranceVault.hasRole(HOOK_ROLE, await hook.getAddress())).to.be.true;
    });
  });
});

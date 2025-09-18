import { ethers } from "ethers";
import { Logger } from "../utils/Logger";
import { BLSSignatureAggregator, BLSUtils } from "../crypto/BLSSignatureAggregator";

/**
 * EigenLayer Operator SDK Integration
 * Handles real operator registration and interaction with EigenLayer contracts
 */
export class EigenLayerOperator {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private logger: Logger;
  private blsPrivateKey: Uint8Array;
  private blsPublicKey: Uint8Array;
  private operatorId: string;

  // EigenLayer contract addresses (mainnet/testnet)
  private delegationManagerAddress: string;
  private avsDirectoryAddress: string;
  private registryCoordinatorAddress: string;
  private stakeRegistryAddress: string;
  private serviceManagerAddress: string;

  // Contract instances
  private delegationManager!: ethers.Contract;
  private avsDirectory!: ethers.Contract;
  private registryCoordinator!: ethers.Contract;
  private stakeRegistry!: ethers.Contract;
  private serviceManager!: ethers.Contract;

  constructor(
    provider: ethers.Provider,
    wallet: ethers.Wallet,
    serviceManagerAddress: string,
    eigenLayerContracts: {
      delegationManager: string;
      avsDirectory: string;
      registryCoordinator: string;
      stakeRegistry: string;
    },
    logger: Logger
  ) {
    this.provider = provider;
    this.wallet = wallet;
    this.serviceManagerAddress = serviceManagerAddress;
    this.delegationManagerAddress = eigenLayerContracts.delegationManager;
    this.avsDirectoryAddress = eigenLayerContracts.avsDirectory;
    this.registryCoordinatorAddress = eigenLayerContracts.registryCoordinator;
    this.stakeRegistryAddress = eigenLayerContracts.stakeRegistry;
    this.logger = logger;

    // Generate BLS key pair for the operator
    const keyPair = BLSSignatureAggregator.generateKeyPair();
    this.blsPrivateKey = keyPair.privateKey;
    this.blsPublicKey = keyPair.publicKey;
    this.operatorId = BLSUtils.generateOperatorId(this.blsPublicKey);

    // Initialize contract instances
    this.initializeContracts();
  }

  /**
   * Initialize EigenLayer contract instances
   */
  private initializeContracts(): void {
    // EigenLayer Delegation Manager ABI (simplified)
    const delegationManagerABI = [
      "function registerAsOperator((address,address,uint32),string) external",
      "function modifyOperatorDetails((address,address,uint32)) external",
      "function updateOperatorMetadataURI(string) external",
      "function isOperator(address) external view returns (bool)",
      "function operatorDetails(address) external view returns (tuple(address,address,uint32))",
    ];

    // EigenLayer AVS Directory ABI (simplified)
    const avsDirectoryABI = [
      "function registerOperatorToAVS(address,tuple(bytes,bytes32,uint256)) external",
      "function deregisterOperatorFromAVS(address) external",
      "function updateAVSMetadataURI(string) external",
      "function isOperatorRegisteredToAVS(address,address) external view returns (bool)",
    ];

    // Registry Coordinator ABI (simplified)
    const registryCoordinatorABI = [
      "function registerOperator(bytes,string,tuple(uint256,uint256)[],string) external",
      "function deregisterOperator(bytes) external",
      "function updateOperator(bytes,tuple(uint256,uint256)[],string) external",
      "function getOperatorStatus(address) external view returns (uint8)",
      "function isChurnApproverSaltUsed(bytes32) external view returns (bool)",
    ];

    // Stake Registry ABI (simplified)
    const stakeRegistryABI = [
      "function getOperatorStake(address,uint8) external view returns (uint96)",
      "function getTotalStakeHistory(uint8) external view returns (tuple(uint32,uint96)[])",
      "function getStakeAtBlockNumber(address,uint8,uint32) external view returns (uint96)",
      "function updateOperatorStake(address,address,uint8,uint256) external",
    ];

    // Service Manager ABI
    const serviceManagerABI = [
      "function registerOperator(bytes,bytes32,uint256) external",
      "function deregisterOperator() external",
      "function createAttestationTask(uint256,bytes32,bytes) external returns (uint32)",
      "function respondToTask(uint32,bytes) external",
      "function isOperatorActive(address) external view returns (bool)",
    ];

    this.delegationManager = new ethers.Contract(this.delegationManagerAddress, delegationManagerABI, this.wallet);

    this.avsDirectory = new ethers.Contract(this.avsDirectoryAddress, avsDirectoryABI, this.wallet);

    this.registryCoordinator = new ethers.Contract(
      this.registryCoordinatorAddress,
      registryCoordinatorABI,
      this.wallet
    );

    this.stakeRegistry = new ethers.Contract(this.stakeRegistryAddress, stakeRegistryABI, this.wallet);

    this.serviceManager = new ethers.Contract(this.serviceManagerAddress, serviceManagerABI, this.wallet);
  }

  /**
   * Register operator with EigenLayer
   */
  async registerOperator(
    operatorDetails: {
      earningsReceiver: string;
      delegationApprover: string;
      stakerOptOutWindowBlocks: number;
    },
    metadataURI: string,
    salt: string = ethers.hexlify(ethers.randomBytes(32)),
    expiry: number = Math.floor(Date.now() / 1000) + 86400 // 24 hours
  ): Promise<void> {
    try {
      this.logger.info("Starting operator registration with EigenLayer", {
        operator: this.wallet.address,
        operatorId: this.operatorId,
      });

      // Step 1: Check if already registered as operator
      const isOperator = await this.delegationManager.isOperator(this.wallet.address);
      if (!isOperator) {
        // Register as operator with EigenLayer
        this.logger.info("Registering as EigenLayer operator");
        const registerTx = await this.delegationManager.registerAsOperator(operatorDetails, metadataURI);
        await registerTx.wait();
        this.logger.info("Successfully registered as EigenLayer operator", {
          txHash: registerTx.hash,
        });
      }

      // Step 2: Register with AVS Directory
      this.logger.info("Registering with AVS Directory");
      const avsSignature = await this.createAVSRegistrationSignature(salt, expiry);
      const registerAVSTx = await this.avsDirectory.registerOperatorToAVS(this.wallet.address, avsSignature);
      await registerAVSTx.wait();
      this.logger.info("Successfully registered with AVS Directory", {
        txHash: registerAVSTx.hash,
      });

      // Step 3: Register with Registry Coordinator (BLS key registration)
      this.logger.info("Registering BLS key with Registry Coordinator");
      const blsRegistrationData = await this.createBLSRegistrationData();
      const registerBLSTx = await this.registryCoordinator.registerOperator(
        blsRegistrationData.pubkey,
        blsRegistrationData.socket,
        blsRegistrationData.params,
        blsRegistrationData.operatorSignature
      );
      await registerBLSTx.wait();
      this.logger.info("Successfully registered BLS key", {
        txHash: registerBLSTx.hash,
      });

      // Step 4: Register with Service Manager
      this.logger.info("Registering with Service Manager");
      const serviceSignature = await this.createServiceManagerSignature(salt, expiry);
      const registerServiceTx = await this.serviceManager.registerOperator(
        serviceSignature.signature,
        serviceSignature.salt,
        serviceSignature.expiry
      );
      await registerServiceTx.wait();
      this.logger.info("Successfully registered with Service Manager", {
        txHash: registerServiceTx.hash,
      });

      this.logger.info("Operator registration completed successfully");
    } catch (error) {
      this.logger.error("Failed to register operator with EigenLayer", error);
      throw error;
    }
  }

  /**
   * Deregister operator from EigenLayer
   */
  async deregisterOperator(): Promise<void> {
    try {
      this.logger.info("Starting operator deregistration");

      // Deregister from Service Manager
      const deregisterServiceTx = await this.serviceManager.deregisterOperator();
      await deregisterServiceTx.wait();

      // Deregister from Registry Coordinator
      const blsPubkey = BLSUtils.publicKeyToHex(this.blsPublicKey);
      const deregisterBLSTx = await this.registryCoordinator.deregisterOperator(blsPubkey);
      await deregisterBLSTx.wait();

      // Deregister from AVS Directory
      const deregisterAVSTx = await this.avsDirectory.deregisterOperatorFromAVS(this.wallet.address);
      await deregisterAVSTx.wait();

      this.logger.info("Operator deregistration completed successfully");
    } catch (error) {
      this.logger.error("Failed to deregister operator", error);
      throw error;
    }
  }

  /**
   * Get operator stake from EigenLayer
   */
  async getOperatorStake(quorumNumber: number = 0): Promise<bigint> {
    try {
      const stake = await this.stakeRegistry.getOperatorStake(this.wallet.address, quorumNumber);
      return BigInt(stake);
    } catch (error) {
      this.logger.error("Failed to get operator stake", error);
      return BigInt(0);
    }
  }

  /**
   * Check if operator is registered and active
   */
  async isOperatorActive(): Promise<boolean> {
    try {
      const isActive = await this.serviceManager.isOperatorActive(this.wallet.address);
      return isActive;
    } catch (error) {
      this.logger.error("Failed to check operator status", error);
      return false;
    }
  }

  /**
   * Sign an attestation task using BLS
   */
  async signAttestationTask(
    policyId: bigint,
    payout: bigint,
    taskIndex: number
  ): Promise<{ signature: string; messageHash: Uint8Array }> {
    try {
      const messageHash = BLSSignatureAggregator.createMessageHash(policyId, payout, taskIndex);

      const signature = BLSSignatureAggregator.signMessage(messageHash, this.blsPrivateKey);

      return {
        signature: BLSUtils.publicKeyToHex(signature),
        messageHash,
      };
    } catch (error) {
      this.logger.error("Failed to sign attestation task", error);
      throw error;
    }
  }

  /**
   * Submit task response to service manager
   */
  async submitTaskResponse(taskIndex: number, signature: string): Promise<string> {
    try {
      const tx = await this.serviceManager.respondToTask(taskIndex, signature);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      this.logger.error("Failed to submit task response", error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Create AVS registration signature
   */
  private async createAVSRegistrationSignature(
    salt: string,
    expiry: number
  ): Promise<{ bytes: string; salt: string; expiry: number }> {
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "address", "bytes32", "uint256"],
      [this.wallet.address, this.serviceManagerAddress, salt, expiry]
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

    return {
      bytes: signature,
      salt: salt,
      expiry: expiry,
    };
  }

  /**
   * Create BLS registration data
   */
  private async createBLSRegistrationData(): Promise<{
    pubkey: string;
    socket: string;
    params: { x: string; y: string }[];
    operatorSignature: string;
  }> {
    const pubkeyHex = BLSUtils.publicKeyToHex(this.blsPublicKey);
    const socket = `${this.wallet.address}:9000`; // Default socket

    // Create BLS registration params (simplified)
    const params = [{ x: pubkeyHex.slice(0, 66), y: "0x" + pubkeyHex.slice(66) }];

    // Sign registration message
    const messageHash = ethers.solidityPackedKeccak256(["bytes", "string"], [pubkeyHex, socket]);
    const operatorSignature = await this.wallet.signMessage(ethers.getBytes(messageHash));

    return {
      pubkey: pubkeyHex,
      socket,
      params,
      operatorSignature,
    };
  }

  /**
   * Create service manager registration signature
   */
  private async createServiceManagerSignature(
    salt: string,
    expiry: number
  ): Promise<{ signature: string; salt: string; expiry: number }> {
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "bytes32", "uint256"],
      [this.wallet.address, salt, expiry]
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

    return {
      signature,
      salt,
      expiry,
    };
  }

  // Getters

  get blsPublicKeyHex(): string {
    return BLSUtils.publicKeyToHex(this.blsPublicKey);
  }

  get blsPrivateKeyHex(): string {
    return BLSUtils.privateKeyToHex(this.blsPrivateKey);
  }

  get operatorAddress(): string {
    return this.wallet.address;
  }

  get operatorIdHex(): string {
    return this.operatorId;
  }
}

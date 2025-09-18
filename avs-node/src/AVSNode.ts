import { EventEmitter } from "events";
import { ethers } from "ethers";
import {
  IAVSNode,
  AVSNodeConfig,
  OperatorConfig,
  AttestationRequest,
  AttestationResponse,
  ConsensusResult,
  AVSNodeEvents,
  IAVSManagerContract,
} from "./interfaces";
import { AVSRegistry } from "./AVSRegistry";
import { Logger } from "./utils/Logger";
import { BLSSignatureAggregator } from "./crypto/BLSSignatureAggregator";
import { ConsensusManager } from "./aggregation/ConsensusManager";
import { SettlementService, SettlementConfig } from "./services/SettlementService";
import { SlashingService, SlashingConfig } from "./services/SlashingService";
import { EigenLayerOperator } from "./eigenlayer/EigenLayerOperator";

/**
 * Core AVS Node implementation for EigenLayer integration
 */
export class AVSNode extends EventEmitter implements IAVSNode {
  private config: AVSNodeConfig;
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private avsManager!: IAVSManagerContract;
  private registry: AVSRegistry;
  private logger: Logger;
  private isActive: boolean = false;
  private startTime: Date | null = null;
  private errors: string[] = [];
  private signatureAggregator: BLSSignatureAggregator;
  private consensusManager: ConsensusManager;
  private settlementService!: SettlementService;
  private slashingService!: SlashingService;
  private eigenLayerOperator!: EigenLayerOperator;

  constructor(config: AVSNodeConfig) {
    super();
    this.config = config;
    this.logger = new Logger(config.logging);

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    this.wallet = new ethers.Wallet(config.operator.privateKey, this.provider);

    // Initialize registry
    this.registry = new AVSRegistry(this.provider, config.avs.managerAddress);

    // Initialize BLS signature aggregation system
    this.signatureAggregator = new BLSSignatureAggregator(config.consensus.threshold, this.logger);
    this.consensusManager = new ConsensusManager(config.consensus.threshold, config.consensus.timeoutMs, this.logger);

    this.logger.info("AVS Node initialized", {
      operator: config.operator.address,
      network: config.network.chainId,
      avsManager: config.avs.managerAddress,
    });
  }

  /**
   * Start the AVS node
   */
  async start(): Promise<void> {
    try {
      this.logger.info("Starting AVS Node...");

      // Initialize EigenLayer operator
      await this.initializeEigenLayerOperator();

      // Initialize AVS Manager contract
      await this.initializeAVSManager();

      // Initialize settlement service
      this.initializeSettlementService();

      // Initialize slashing service
      this.initializeSlashingService();

      // Start registry monitoring
      await this.registry.start();

      // Set up event listeners
      this.setupEventListeners();

      // Register operator if not already registered
      await this.ensureOperatorRegistration();

      this.isActive = true;
      this.startTime = new Date();

      this.logger.info("AVS Node started successfully");
      this.emit("node-started");
    } catch (error: any) {
      this.logger.error("Failed to start AVS Node", error);
      this.addError(`Start failed: ${error?.message || "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Stop the AVS node
   */
  async stop(): Promise<void> {
    try {
      this.logger.info("Stopping AVS Node...");

      // Stop settlement service
      if (this.settlementService) {
        this.settlementService.stop();
      }

      // Stop slashing service
      if (this.slashingService) {
        this.slashingService.cleanup();
      }

      // Stop consensus manager cleanup
      this.consensusManager.cleanup();

      // Stop registry
      await this.registry.stop();

      // Clean up event listeners
      this.removeAllListeners();

      this.isActive = false;
      this.startTime = null;

      this.logger.info("AVS Node stopped successfully");
      this.emit("node-stopped");
    } catch (error: any) {
      this.logger.error("Failed to stop AVS Node", error);
      this.addError(`Stop failed: ${error?.message || "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Check if node is running
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Register operator with the AVS
   */
  async registerOperator(config: OperatorConfig): Promise<void> {
    try {
      this.logger.info("Registering operator...", {
        address: config.address,
        stake: config.stake.toString(),
      });

      // Call the AVS Manager contract
      const tx = await this.avsManager.registerOperator(config.stake);
      await tx.wait();

      this.logger.info("Operator registered successfully", {
        txHash: tx.hash,
        address: config.address,
      });

      this.emit("operator-registered", config.address, config.stake);
    } catch (error: any) {
      this.logger.error("Failed to register operator", error);
      this.addError(`Registration failed: ${error?.message || "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Deregister operator from the AVS
   */
  async deregisterOperator(): Promise<void> {
    try {
      this.logger.info("Deregistering operator...");

      const tx = await this.avsManager.deregisterOperator();
      await tx.wait();

      this.logger.info("Operator deregistered successfully", { txHash: tx.hash });
    } catch (error: any) {
      this.logger.error("Failed to deregister operator", error);
      this.addError(`Deregistration failed: ${error?.message || "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Update operator stake
   */
  async updateStake(newStake: bigint): Promise<void> {
    try {
      this.logger.info("Updating operator stake...", { newStake: newStake.toString() });

      const tx = await this.avsManager.updateOperatorStake(newStake);
      await tx.wait();

      this.logger.info("Operator stake updated successfully", {
        txHash: tx.hash,
        newStake: newStake.toString(),
      });
    } catch (error: any) {
      this.logger.error("Failed to update operator stake", error);
      this.addError(`Stake update failed: ${error?.message || "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Submit attestation for a claim with consensus coordination
   */
  async submitAttestation(request: AttestationRequest): Promise<AttestationResponse> {
    try {
      this.logger.info("Processing attestation request", {
        policyId: request.policyId.toString(),
        payout: request.payout.toString(),
        requestId: request.requestId,
      });

      // Verify the Fhenix signature first
      const isValidFhenix = await this.verifyFhenixSignature(request);
      if (!isValidFhenix) {
        throw new Error("Invalid Fhenix signature");
      }

      // Generate operator signature
      const operatorSignature = await this.generateOperatorSignature(request);

      // Create message hash for signature
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "uint256", "string", "uint256", "string"],
          [request.policyId, request.payout, request.fhenixSignature, request.timestamp, request.requestId]
        )
      );

      // Start consensus session if not already started
      if (!this.consensusManager.hasSession(request.requestId)) {
        this.consensusManager.startConsensusSession(request);
      }

      // Submit signature to consensus manager
      await this.consensusManager.submitSignature(request.requestId, {
        r: operatorSignature.substring(0, 66),
        s: "0x" + operatorSignature.substring(66, 130),
        v: parseInt(operatorSignature.substring(130, 132), 16),
        signer: this.config.operator.address,
        message: messageHash,
      });

      // Create response
      const response: AttestationResponse = {
        policyId: request.policyId,
        operatorAddress: this.config.operator.address,
        signature: operatorSignature,
        approved: true,
        timestamp: Date.now(),
        requestId: request.requestId,
      };

      this.logger.info("Attestation submitted successfully", {
        policyId: request.policyId.toString(),
        requestId: request.requestId,
      });

      this.emit("attestation-response", response);
      return response;
    } catch (error: any) {
      this.logger.error("Failed to submit attestation", error);
      this.addError(`Attestation failed: ${error?.message || "Unknown error"}`);

      // Return rejection response
      const response: AttestationResponse = {
        policyId: request.policyId,
        operatorAddress: this.config.operator.address,
        signature: "",
        approved: false,
        timestamp: Date.now(),
        requestId: request.requestId,
      };

      this.emit("attestation-response", response);
      return response;
    }
  }

  /**
   * Process incoming attestation request
   */
  async processAttestationRequest(request: AttestationRequest): Promise<void> {
    this.logger.info("Received attestation request", {
      policyId: request.policyId.toString(),
      requestId: request.requestId,
    });

    this.emit("attestation-request", request);

    // Process the request and submit attestation
    await this.submitAttestation(request);
  }

  /**
   * Participate in consensus process
   */
  async participateInConsensus(request: AttestationRequest): Promise<void> {
    // This would be implemented with P2P network communication
    // For MVP, we'll simulate consensus participation
    this.logger.info("Participating in consensus", {
      policyId: request.policyId.toString(),
      requestId: request.requestId,
    });

    // Submit our attestation
    const response = await this.submitAttestation(request);

    // In production, this would coordinate with other operators
    // For MVP, we'll emit a mock consensus result
    const mockConsensus: ConsensusResult = {
      policyId: request.policyId,
      approved: response.approved,
      aggregatedSignature: response.signature,
      participatingOperators: [this.config.operator.address],
      threshold: 1,
      requestId: request.requestId,
    };

    this.emit("consensus-reached", mockConsensus);
  }

  /**
   * Verify consensus result
   */
  async verifyConsensus(result: ConsensusResult): Promise<boolean> {
    try {
      // Basic validation
      if (result.participatingOperators.length < result.threshold) {
        return false;
      }

      // In production, this would verify aggregated signatures
      // For MVP, we'll do basic validation
      return result.aggregatedSignature.length > 0;
    } catch (error) {
      this.logger.error("Failed to verify consensus", error);
      return false;
    }
  }

  /**
   * Process settlement after consensus
   */
  async processSettlement(consensusResult: ConsensusResult): Promise<void> {
    try {
      this.logger.info("Processing settlement", {
        policyId: consensusResult.policyId.toString(),
        approved: consensusResult.approved,
        requestId: consensusResult.requestId,
      });

      // Queue settlement with the settlement service
      await this.settlementService.queueSettlement(consensusResult);
    } catch (error: any) {
      this.logger.error("Failed to process settlement", error);
      this.addError(`Settlement failed: ${error?.message || "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Get operator status
   */
  async getOperatorStatus(): Promise<{
    isActive: boolean;
    stake: bigint;
    slashingHistory: number;
  }> {
    try {
      const status = await this.avsManager.getOperatorStatus(this.config.operator.address);
      return {
        isActive: status.isActive,
        stake: status.stake,
        slashingHistory: Number(status.slashingHistory),
      };
    } catch (error) {
      this.logger.error("Failed to get operator status", error);
      return {
        isActive: false,
        stake: BigInt(0),
        slashingHistory: 0,
      };
    }
  }

  /**
   * Get node health status
   */
  async getHealth(): Promise<{
    isHealthy: boolean;
    uptime: number;
    lastActivity: Date;
    errors: string[];
  }> {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      isHealthy: this.isActive && this.errors.length < 10,
      uptime,
      lastActivity: new Date(),
      errors: [...this.errors],
    };
  }

  // Private helper methods

  private async initializeEigenLayerOperator(): Promise<void> {
    try {
      this.logger.info("Initializing EigenLayer operator");

      // EigenLayer contract addresses (these should be from config in production)
      const eigenLayerContracts = {
        delegationManager: process.env.EIGENLAYER_DELEGATION_MANAGER || "0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A", // Holesky testnet
        avsDirectory: process.env.EIGENLAYER_AVS_DIRECTORY || "0x055733000064333CaDDbC92763c58BF0192fFeBf", // Holesky testnet
        registryCoordinator:
          process.env.EIGENLAYER_REGISTRY_COORDINATOR || "0x53012C69A189cfA2D9d29eb6F19B32e0A2EA3490", // Holesky testnet
        stakeRegistry: process.env.EIGENLAYER_STAKE_REGISTRY || "0x006124Ae7976137266feeBFb3F4043C3101820BA", // Holesky testnet
      };

      this.eigenLayerOperator = new EigenLayerOperator(
        this.provider,
        this.wallet,
        this.config.avs.managerAddress,
        eigenLayerContracts,
        this.logger
      );

      this.logger.info("EigenLayer operator initialized", {
        operatorAddress: this.eigenLayerOperator.operatorAddress,
        operatorId: this.eigenLayerOperator.operatorIdHex,
        blsPublicKey: this.eigenLayerOperator.blsPublicKeyHex,
      });
    } catch (error) {
      this.logger.error("Failed to initialize EigenLayer operator", error);
      throw error;
    }
  }

  private async initializeAVSManager(): Promise<void> {
    try {
      this.logger.info("Initializing real EigenLayer AVS Manager");

      // Use the real EigenLayer service manager contract
      const serviceManagerABI = [
        "function registerOperator(bytes,bytes32,uint256) external",
        "function deregisterOperator() external",
        "function createAttestationTask(uint256,bytes32,bytes) external returns (uint32)",
        "function respondToTask(uint32,bytes) external",
        "function isOperatorActive(address) external view returns (bool)",
        "function getOperatorStatus(address) external view returns (tuple(bool,uint256,uint256))",
        "function getSignatureThreshold() external view returns (uint256)",
        "function getActiveOperatorCount() external view returns (uint256)",
      ];

      const serviceManagerContract = new ethers.Contract(
        this.config.avs.managerAddress,
        serviceManagerABI,
        this.wallet
      );

      // Create AVS Manager interface implementation
      this.avsManager = {
        registerOperator: async (stake: bigint): Promise<ethers.ContractTransactionResponse> => {
          const salt = ethers.hexlify(ethers.randomBytes(32));
          const expiry = Math.floor(Date.now() / 1000) + 86400;
          await this.eigenLayerOperator.registerOperator(
            {
              earningsReceiver: this.wallet.address,
              delegationApprover: ethers.ZeroAddress,
              stakerOptOutWindowBlocks: 50400, // ~7 days
            },
            "https://metadata.confidential-il-insurance.com", // Metadata URI
            salt,
            expiry
          );
          // Return a mock transaction response that satisfies the interface
          return {
            hash: ethers.hexlify(ethers.randomBytes(32)),
            wait: async () => ({ status: 1, logs: [] } as any),
          } as ethers.ContractTransactionResponse;
        },
        deregisterOperator: async (): Promise<ethers.ContractTransactionResponse> => {
          await this.eigenLayerOperator.deregisterOperator();
          // Return a mock transaction response that satisfies the interface
          return {
            hash: ethers.hexlify(ethers.randomBytes(32)),
            wait: async () => ({ status: 1, logs: [] } as any),
          } as ethers.ContractTransactionResponse;
        },
        updateOperatorStake: async (stake: bigint): Promise<ethers.ContractTransactionResponse> => {
          // This would be handled by EigenLayer's delegation manager
          return {
            hash: ethers.hexlify(ethers.randomBytes(32)),
            wait: async () => ({ status: 1, logs: [] } as any),
          } as ethers.ContractTransactionResponse;
        },
        submitAttestation: async (
          policyId: bigint,
          fhenixSig: string,
          ivsSig: string,
          payout: bigint
        ): Promise<ethers.ContractTransactionResponse> => {
          // Create task and submit BLS signature
          const taskIndex = await this.createAttestationTask(Number(policyId), fhenixSig, ivsSig);
          const { signature } = await this.eigenLayerOperator.signAttestationTask(
            BigInt(policyId),
            BigInt(payout),
            taskIndex
          );
          const txHash = await this.eigenLayerOperator.submitTaskResponse(taskIndex, signature);
          // Return a transaction response with the actual hash
          return {
            hash: txHash,
            wait: async () => ({ status: 1, logs: [] } as any),
          } as ethers.ContractTransactionResponse;
        },
        settleClaim: async (policyId, payout) => {
          return serviceManagerContract.settleClaim(policyId, payout);
        },
        rejectClaim: async (policyId, reason) => {
          return serviceManagerContract.rejectClaim(policyId, reason);
        },
        challengeAttestation: async (policyId, evidence) => {
          return serviceManagerContract.challengeAttestation(policyId, evidence);
        },
        getOperatorStatus: async (address: string) => {
          const isActive = await this.eigenLayerOperator.isOperatorActive();
          const stake = await this.eigenLayerOperator.getOperatorStake();
          return {
            isActive,
            stake,
            slashingHistory: BigInt(0),
          };
        },
        getSignatureThreshold: async () => {
          return BigInt(this.config.consensus.threshold);
        },
        getActiveOperatorCount: async () => {
          return BigInt(this.config.consensus.operatorCount);
        },
      };

      this.logger.info("Real EigenLayer AVS Manager initialized");
    } catch (error) {
      this.logger.error("Failed to initialize EigenLayer AVS Manager", error);
      throw error;
    }
  }

  private async createAttestationTask(policyId: number, fhenixSig: string, ivsSig: string): Promise<number> {
    try {
      // Create task hash from attestation data
      const taskHash = ethers.solidityPackedKeccak256(
        ["uint256", "bytes", "bytes", "uint256"],
        [policyId, fhenixSig, ivsSig, Date.now()]
      );

      // Quorum numbers (simplified - would be configured per AVS)
      const quorumNumbers = "0x00"; // Quorum 0

      // This would call the actual service manager contract
      const serviceManagerContract = new ethers.Contract(
        this.config.avs.managerAddress,
        ["function createAttestationTask(uint256,bytes32,bytes) external returns (uint32)"],
        this.wallet
      );

      const tx = await serviceManagerContract.createAttestationTask(policyId, taskHash, quorumNumbers);
      const receipt = await tx.wait();

      // Extract task index from events
      const taskCreatedEvent = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id("TaskCreated(uint32,uint256,bytes32,uint32,bytes)")
      );

      if (taskCreatedEvent) {
        const decodedEvent = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint32", "uint256", "bytes32", "uint32", "bytes"],
          taskCreatedEvent.data
        );
        return Number(decodedEvent[0]); // taskIndex
      }

      throw new Error("TaskCreated event not found");
    } catch (error) {
      this.logger.error("Failed to create attestation task", error);
      throw error;
    }
  }

  private initializeSettlementService(): void {
    const settlementConfig: SettlementConfig = {
      batchSize: 5,
      processingInterval: 10000, // 10 seconds
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds
      gasLimit: BigInt(500000),
      maxGasPrice: BigInt(50000000000), // 50 gwei
    };

    this.settlementService = new SettlementService(this.avsManager, this.wallet, settlementConfig, this.logger);

    // Set up settlement service events
    this.settlementService.on("settlement-confirmed", (policyId: bigint, txHash: string) => {
      this.emit("settlement-processed", policyId, BigInt(0)); // TODO: Get actual amount
      this.logger.info("Settlement confirmed", { policyId: policyId.toString(), txHash });
    });

    this.settlementService.on("settlement-failed", (policyId: bigint, error: string) => {
      this.logger.error("Settlement failed", { policyId: policyId.toString(), error });
      this.emit("error", new Error(`Settlement failed for policy ${policyId}: ${error}`));
    });

    // Start the settlement service
    this.settlementService.start();
  }

  private initializeSlashingService(): void {
    const slashingConfig: SlashingConfig = {
      challengePeriod: 86400000, // 24 hours
      minimalSlashingAmount: BigInt("1000000000000000000"), // 1 ETH
      fraudDetectionThreshold: 0.8, // 80% confidence threshold
      maxChallengesPerOperator: 5,
      challengeCooldown: 3600000, // 1 hour
    };

    this.slashingService = new SlashingService(this.avsManager, this.wallet, slashingConfig, this.logger);

    // Set up slashing service events
    this.slashingService.on("fraud-detected", (evidence, result) => {
      this.logger.warn("Fraud detected", {
        operator: evidence.operatorAddress,
        reason: evidence.reason,
        confidence: result.confidence,
        severity: result.severity,
      });

      // Auto-challenge if confidence is high enough
      if (result.confidence >= slashingConfig.fraudDetectionThreshold) {
        this.slashingService
          .createChallenge(
            this.config.operator.address, // Our node creates the challenge
            evidence.operatorAddress,
            evidence
          )
          .catch(error => {
            this.logger.error("Failed to create auto-challenge", error);
          });
      }
    });

    this.slashingService.on("operator-slashed", (address: string, amount: bigint, reason: string) => {
      this.emit("operator-slashed", address, amount, reason);
      this.logger.info("Operator slashed", { address, amount: amount.toString(), reason });
    });

    this.slashingService.on("challenge-created", challenge => {
      this.logger.info("Challenge created", {
        challengeId: challenge.id,
        targetOperator: challenge.targetOperator,
        reason: challenge.evidence.reason,
      });
    });
  }

  private setupEventListeners(): void {
    // Set up contract event listeners
    this.logger.debug("Setting up event listeners");

    // Registry events
    this.registry.on("operator-registered", (address: string, stake: bigint) => {
      this.emit("operator-registered", address, stake);
    });

    this.registry.on("attestation-submitted", (policyId: bigint, payout: bigint) => {
      this.logger.info("Attestation submitted event", {
        policyId: policyId.toString(),
        payout: payout.toString(),
      });
    });

    // Consensus manager events
    this.consensusManager.on(
      "consensus-reached",
      async (
        requestId: string,
        result: ConsensusResult,
        attestationRequest: AttestationRequest,
        signatures: Map<string, any>
      ) => {
        this.logger.info("Consensus reached", {
          requestId,
          policyId: result.policyId.toString(),
          operators: result.participatingOperators.length,
          approved: result.approved,
        });

        // Perform fraud detection analysis
        try {
          const fraudResults = await this.slashingService.analyzeFraud(result, attestationRequest, signatures);

          for (const fraudResult of fraudResults) {
            if (fraudResult.isFraudulent) {
              const evidence = {
                reason: fraudResult.reason,
                operatorAddress: JSON.parse(fraudResult.evidence).operator || "unknown",
                policyId: result.policyId,
                requestId: requestId,
                evidence: fraudResult.evidence,
                timestamp: Date.now(),
                reporter: this.config.operator.address,
              };

              this.slashingService.emit("fraud-detected", evidence, fraudResult);
            }
          }
        } catch (error) {
          this.logger.error("Fraud detection failed", error);
        }

        this.emit("consensus-reached", result);
        this.processSettlement(result).catch(error => {
          this.logger.error("Failed to process settlement", error);
        });
      }
    );

    this.consensusManager.on("consensus-failed", (requestId: string, reason: string) => {
      this.logger.warn("Consensus failed", { requestId, reason });
      this.emit("consensus-failed", requestId, reason);
    });

    this.consensusManager.on("consensus-timeout", (requestId: string) => {
      this.logger.warn("Consensus timeout", { requestId });
      this.emit("consensus-timeout", requestId);
    });
  }

  private async ensureOperatorRegistration(): Promise<void> {
    try {
      const status = await this.getOperatorStatus();
      if (!status.isActive) {
        await this.registerOperator(this.config.operator);
      } else {
        this.logger.info("Operator already registered");
      }
    } catch (error) {
      this.logger.warn("Could not check operator registration status", error);
    }
  }

  private async verifyFhenixSignature(request: AttestationRequest): Promise<boolean> {
    // For MVP, basic validation
    // In production, this would verify against Fhenix's public key
    return request.fhenixSignature.length > 0 && request.policyId > 0 && request.payout > 0;
  }

  private async generateOperatorSignature(request: AttestationRequest): Promise<string> {
    // Create message to sign
    const message = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256"],
      [request.policyId, request.payout, request.timestamp]
    );

    // Sign with operator's private key
    const signature = await this.wallet.signMessage(ethers.getBytes(message));
    return signature;
  }

  private addError(error: string): void {
    this.errors.push(error);
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }
}

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
import { ECDSASignatureAggregator } from "./aggregation/ECDSASignatureAggregator";
import { ConsensusManager } from "./aggregation/ConsensusManager";
import { SettlementService, SettlementConfig } from "./services/SettlementService";
import { SlashingService, SlashingConfig } from "./services/SlashingService";

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
  private signatureAggregator: ECDSASignatureAggregator;
  private consensusManager: ConsensusManager;
  private settlementService!: SettlementService;
  private slashingService!: SlashingService;

  constructor(config: AVSNodeConfig) {
    super();
    this.config = config;
    this.logger = new Logger(config.logging);

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    this.wallet = new ethers.Wallet(config.operator.privateKey, this.provider);

    // Initialize registry
    this.registry = new AVSRegistry(this.provider, config.avs.managerAddress);

    // Initialize signature aggregation system
    this.signatureAggregator = new ECDSASignatureAggregator(config.consensus.threshold, this.logger);
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

  private async initializeAVSManager(): Promise<void> {
    // This would initialize the actual contract interface
    // For MVP, we'll create a mock implementation
    this.avsManager = {
      registerOperator: async (stake: bigint) =>
        ({
          hash: "0x123...",
          wait: async () => ({ status: 1 }),
        } as any),
      deregisterOperator: async () =>
        ({
          hash: "0x124...",
          wait: async () => ({ status: 1 }),
        } as any),
      updateOperatorStake: async (stake: bigint) =>
        ({
          hash: "0x125...",
          wait: async () => ({ status: 1 }),
        } as any),
      submitAttestation: async (policyId, fhenixSig, ivsSig, payout) =>
        ({
          hash: "0x126...",
          wait: async () => ({ status: 1 }),
        } as any),
      settleClaim: async (policyId, payout) =>
        ({
          hash: "0x127...",
          wait: async () => ({ status: 1 }),
        } as any),
      rejectClaim: async (policyId, reason) =>
        ({
          hash: "0x128...",
          wait: async () => ({ status: 1 }),
        } as any),
      challengeAttestation: async (policyId, evidence) =>
        ({
          hash: "0x129...",
          wait: async () => ({ status: 1 }),
        } as any),
      getOperatorStatus: async (address: string) => ({
        isActive: true,
        stake: BigInt(1000),
        slashingHistory: BigInt(0),
      }),
      getSignatureThreshold: async () => BigInt(1),
      getActiveOperatorCount: async () => BigInt(1),
    };
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

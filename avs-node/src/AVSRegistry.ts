import { EventEmitter } from "events";
import { ethers } from "ethers";
import { Logger } from "./utils/Logger";

/**
 * Registry service for monitoring AVS events and operator status
 */
export class AVSRegistry extends EventEmitter {
  private provider: ethers.Provider;
  private avsManagerAddress: string;
  private contract: ethers.Contract | null = null;
  private logger: Logger;
  private isMonitoring: boolean = false;
  private blockNumber: number = 0;

  // Event signatures for monitoring
  private readonly EVENT_SIGNATURES = {
    AttestationSubmitted: "AttestationSubmitted(uint256,bytes,bytes,uint256)",
    ClaimSettled: "ClaimSettled(uint256,uint256,address)",
    OperatorRegistered: "OperatorRegistered(address,uint256)",
    OperatorDeregistered: "OperatorDeregistered(address)",
    OperatorStakeUpdated: "OperatorStakeUpdated(address,uint256)",
    OperatorSlashed: "OperatorSlashed(address,uint256,string)",
    ClaimRejected: "ClaimRejected(uint256,string)",
    AttestationChallenged: "AttestationChallenged(uint256,address,bytes)",
  };

  constructor(provider: ethers.Provider, avsManagerAddress: string) {
    super();
    this.provider = provider;
    this.avsManagerAddress = avsManagerAddress;
    this.logger = new Logger({ level: "info" });
  }

  /**
   * Start monitoring AVS events
   */
  async start(): Promise<void> {
    try {
      this.logger.info("Starting AVS Registry monitoring...");

      // Initialize contract
      await this.initializeContract();

      // Get current block number
      this.blockNumber = await this.provider.getBlockNumber();

      // Set up event listeners
      this.setupEventListeners();

      // Start periodic status checks
      this.startStatusMonitoring();

      this.isMonitoring = true;
      this.logger.info("AVS Registry monitoring started", {
        contract: this.avsManagerAddress,
        blockNumber: this.blockNumber,
      });
    } catch (error) {
      this.logger.error("Failed to start AVS Registry", error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    try {
      this.logger.info("Stopping AVS Registry monitoring...");

      if (this.contract) {
        // Remove all listeners
        this.contract.removeAllListeners();
      }

      this.isMonitoring = false;
      this.removeAllListeners();

      this.logger.info("AVS Registry monitoring stopped");
    } catch (error) {
      this.logger.error("Failed to stop AVS Registry", error);
      throw error;
    }
  }

  /**
   * Get operator information
   */
  async getOperatorInfo(operatorAddress: string): Promise<{
    isActive: boolean;
    stake: bigint;
    slashingHistory: bigint;
  } | null> {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const [isActive, stake, slashingHistory] = await this.contract.getOperatorStatus(operatorAddress);

      return {
        isActive,
        stake,
        slashingHistory,
      };
    } catch (error) {
      this.logger.error("Failed to get operator info", { operatorAddress, error });
      return null;
    }
  }

  /**
   * Get all registered operators
   */
  async getAllOperators(): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const operatorCount = await this.contract.getOperatorCount();
      const operators: string[] = [];

      // For MVP, we'll implement a simple approach
      // In production, this might be optimized with event logs
      for (let i = 0; i < operatorCount; i++) {
        try {
          // This assumes there's a way to get operator by index
          // We might need to implement this differently based on actual contract
          const operator = await this.contract.operatorList(i);
          operators.push(operator);
        } catch (error) {
          // Skip if operator doesn't exist at this index
          continue;
        }
      }

      return operators;
    } catch (error) {
      this.logger.error("Failed to get all operators", error);
      return [];
    }
  }

  /**
   * Get active operator count
   */
  async getActiveOperatorCount(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const count = await this.contract.getActiveOperatorCount();
      return Number(count);
    } catch (error) {
      this.logger.error("Failed to get active operator count", error);
      return 0;
    }
  }

  /**
   * Get signature threshold
   */
  async getSignatureThreshold(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const threshold = await this.contract.getSignatureThreshold();
      return Number(threshold);
    } catch (error) {
      this.logger.error("Failed to get signature threshold", error);
      return 1;
    }
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  // Private methods

  private async initializeContract(): Promise<void> {
    // For MVP, we'll create a minimal ABI for the functions we need
    const minimalABI = [
      "function getOperatorStatus(address) view returns (bool, uint256, uint256)",
      "function getOperatorCount() view returns (uint256)",
      "function getActiveOperatorCount() view returns (uint256)",
      "function getSignatureThreshold() view returns (uint256)",
      "function operatorList(uint256) view returns (address)",

      // Events
      "event AttestationSubmitted(uint256 indexed policyId, bytes fhenixSig, bytes ivsSig, uint256 payout)",
      "event ClaimSettled(uint256 indexed policyId, uint256 payout, address indexed to)",
      "event OperatorRegistered(address indexed operator, uint256 stake)",
      "event OperatorDeregistered(address indexed operator)",
      "event OperatorStakeUpdated(address indexed operator, uint256 newStake)",
      "event OperatorSlashed(address indexed operator, uint256 amount, string reason)",
      "event ClaimRejected(uint256 indexed policyId, string reason)",
      "event AttestationChallenged(uint256 indexed policyId, address indexed challenger, bytes evidence)",
    ];

    this.contract = new ethers.Contract(this.avsManagerAddress, minimalABI, this.provider);
  }

  private setupEventListeners(): void {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    this.logger.debug("Setting up contract event listeners");

    // Attestation events
    this.contract.on("AttestationSubmitted", (policyId, fhenixSig, ivsSig, payout, event) => {
      this.logger.info("AttestationSubmitted event", {
        policyId: policyId.toString(),
        payout: payout.toString(),
        blockNumber: event.blockNumber,
      });

      this.emit("attestation-submitted", {
        policyId,
        fhenixSig,
        ivsSig,
        payout,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      });
    });

    this.contract.on("ClaimSettled", (policyId, payout, to, event) => {
      this.logger.info("ClaimSettled event", {
        policyId: policyId.toString(),
        payout: payout.toString(),
        to,
        blockNumber: event.blockNumber,
      });

      this.emit("claim-settled", {
        policyId,
        payout,
        to,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      });
    });

    // Operator events
    this.contract.on("OperatorRegistered", (operator, stake, event) => {
      this.logger.info("OperatorRegistered event", {
        operator,
        stake: stake.toString(),
        blockNumber: event.blockNumber,
      });

      this.emit("operator-registered", operator, stake);
    });

    this.contract.on("OperatorDeregistered", (operator, event) => {
      this.logger.info("OperatorDeregistered event", {
        operator,
        blockNumber: event.blockNumber,
      });

      this.emit("operator-deregistered", operator);
    });

    this.contract.on("OperatorStakeUpdated", (operator, newStake, event) => {
      this.logger.info("OperatorStakeUpdated event", {
        operator,
        newStake: newStake.toString(),
        blockNumber: event.blockNumber,
      });

      this.emit("operator-stake-updated", operator, newStake);
    });

    this.contract.on("OperatorSlashed", (operator, amount, reason, event) => {
      this.logger.warn("OperatorSlashed event", {
        operator,
        amount: amount.toString(),
        reason,
        blockNumber: event.blockNumber,
      });

      this.emit("operator-slashed", operator, amount, reason);
    });

    // Claim events
    this.contract.on("ClaimRejected", (policyId, reason, event) => {
      this.logger.info("ClaimRejected event", {
        policyId: policyId.toString(),
        reason,
        blockNumber: event.blockNumber,
      });

      this.emit("claim-rejected", policyId, reason);
    });

    this.contract.on("AttestationChallenged", (policyId, challenger, evidence, event) => {
      this.logger.warn("AttestationChallenged event", {
        policyId: policyId.toString(),
        challenger,
        blockNumber: event.blockNumber,
      });

      this.emit("attestation-challenged", policyId, challenger, evidence);
    });

    // Error handling
    this.contract.on("error", error => {
      this.logger.error("Contract event error", error);
      this.emit("error", error);
    });
  }

  private startStatusMonitoring(): void {
    // Periodic status checks every 30 seconds
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock > this.blockNumber + 10) {
          this.logger.debug("Block progression check", {
            previous: this.blockNumber,
            current: currentBlock,
          });
          this.blockNumber = currentBlock;
        }

        // Emit health status
        this.emit("health-check", {
          isHealthy: true,
          blockNumber: currentBlock,
          timestamp: Date.now(),
        });
      } catch (error) {
        this.logger.error("Status monitoring error", error);
        this.emit("health-check", {
          isHealthy: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        });
      }
    }, 30000);
  }

  /**
   * Get historical events
   */
  async getHistoricalEvents(
    eventName: keyof typeof this.EVENT_SIGNATURES,
    fromBlock: number = 0,
    toBlock: number | "latest" = "latest"
  ): Promise<any[]> {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      const filter = this.contract.filters[eventName]();
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => {
        if ("args" in event) {
          return {
            ...event.args,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            logIndex: "logIndex" in event ? event.logIndex : undefined,
          };
        } else {
          return {
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          };
        }
      });
    } catch (error) {
      this.logger.error("Failed to get historical events", { eventName, error });
      return [];
    }
  }
}

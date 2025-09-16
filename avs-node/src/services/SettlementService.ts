import { ethers } from "ethers";
import { EventEmitter } from "events";
import { ConsensusResult, IAVSManagerContract } from "../interfaces";
import { Logger } from "../utils/Logger";

/**
 * Configuration for settlement service
 */
export interface SettlementConfig {
  batchSize: number;
  processingInterval: number;
  retryAttempts: number;
  retryDelay: number;
  gasLimit: bigint;
  maxGasPrice: bigint;
}

/**
 * Settlement transaction details
 */
export interface SettlementTransaction {
  consensusResult: ConsensusResult;
  txHash?: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
  gasUsed?: bigint;
  gasPrice?: bigint;
  timestamp: number;
  attempts: number;
  error?: string;
}

/**
 * Settlement service events
 */
export interface SettlementServiceEvents {
  "settlement-initiated": (policyId: bigint, amount: bigint) => void;
  "settlement-confirmed": (policyId: bigint, txHash: string) => void;
  "settlement-failed": (policyId: bigint, error: string) => void;
  "batch-processed": (count: number, successful: number, failed: number) => void;
}

/**
 * Automated settlement service for processing consensus results
 */
export class SettlementService extends EventEmitter {
  private avsManager: IAVSManagerContract;
  private wallet: ethers.Wallet;
  private logger: Logger;
  private config: SettlementConfig;
  private pendingSettlements: Map<string, SettlementTransaction> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor(avsManager: IAVSManagerContract, wallet: ethers.Wallet, config: SettlementConfig, logger?: Logger) {
    super();
    this.avsManager = avsManager;
    this.wallet = wallet;
    this.config = config;
    this.logger = logger || new Logger({ level: "info" });
  }

  /**
   * Start the settlement service
   */
  start(): void {
    if (this.processingInterval) {
      this.logger.warn("Settlement service already started");
      return;
    }

    this.logger.info("Starting settlement service", {
      batchSize: this.config.batchSize,
      interval: this.config.processingInterval,
    });

    this.processingInterval = setInterval(() => this.processPendingSettlements(), this.config.processingInterval);
  }

  /**
   * Stop the settlement service
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.info("Settlement service stopped");
    }
  }

  /**
   * Queue a consensus result for settlement
   */
  async queueSettlement(consensusResult: ConsensusResult): Promise<void> {
    const key = `${consensusResult.policyId}-${consensusResult.requestId}`;

    if (this.pendingSettlements.has(key)) {
      this.logger.warn("Settlement already queued", {
        policyId: consensusResult.policyId.toString(),
        requestId: consensusResult.requestId,
      });
      return;
    }

    const settlement: SettlementTransaction = {
      consensusResult,
      status: "pending",
      timestamp: Date.now(),
      attempts: 0,
    };

    this.pendingSettlements.set(key, settlement);

    this.logger.info("Settlement queued", {
      policyId: consensusResult.policyId.toString(),
      requestId: consensusResult.requestId,
      approved: consensusResult.approved,
    });

    // Process immediately if not already processing
    if (!this.isProcessing) {
      setImmediate(() => this.processPendingSettlements());
    }
  }

  /**
   * Process pending settlements in batches
   */
  private async processPendingSettlements(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pending = Array.from(this.pendingSettlements.values())
        .filter(s => s.status === "pending" || s.status === "failed")
        .slice(0, this.config.batchSize);

      if (pending.length === 0) {
        return;
      }

      this.logger.info("Processing settlement batch", { count: pending.length });

      let successful = 0;
      let failed = 0;

      for (const settlement of pending) {
        try {
          await this.processSettlement(settlement);
          successful++;
        } catch (error) {
          failed++;
          this.logger.error("Settlement processing failed", {
            policyId: settlement.consensusResult.policyId.toString(),
            error,
          });
        }
      }

      this.emit("batch-processed", pending.length, successful, failed);

      this.logger.info("Settlement batch completed", {
        total: pending.length,
        successful,
        failed,
      });
    } catch (error) {
      this.logger.error("Batch processing error", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single settlement transaction
   */
  private async processSettlement(settlement: SettlementTransaction): Promise<void> {
    const { consensusResult } = settlement;
    const key = `${consensusResult.policyId}-${consensusResult.requestId}`;

    try {
      settlement.attempts++;
      settlement.status = "submitted";

      this.emit("settlement-initiated", consensusResult.policyId, BigInt(0)); // TODO: Get actual payout

      // Prepare transaction parameters
      const gasPrice = await this.wallet.provider!.getFeeData();
      const effectiveGasPrice =
        gasPrice.gasPrice && gasPrice.gasPrice < this.config.maxGasPrice ? gasPrice.gasPrice : this.config.maxGasPrice;

      let tx: ethers.ContractTransactionResponse;

      if (consensusResult.approved) {
        // Process approved claim - TODO: Get actual payout amount
        tx = await this.avsManager.settleClaim(
          consensusResult.policyId,
          BigInt(0) // TODO: Extract payout from consensus result
        );
      } else {
        // Reject claim
        tx = await this.avsManager.rejectClaim(consensusResult.policyId, "Consensus rejected claim");
      }

      settlement.txHash = tx.hash;
      settlement.gasPrice = effectiveGasPrice;

      this.logger.info("Settlement transaction submitted", {
        policyId: consensusResult.policyId.toString(),
        txHash: tx.hash,
        approved: consensusResult.approved,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        settlement.status = "confirmed";
        settlement.gasUsed = receipt.gasUsed;

        this.emit("settlement-confirmed", consensusResult.policyId, tx.hash);

        this.logger.info("Settlement confirmed", {
          policyId: consensusResult.policyId.toString(),
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
        });

        // Remove from pending list
        this.pendingSettlements.delete(key);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      settlement.status = "failed";
      settlement.error = error?.message || "Unknown error";

      this.emit("settlement-failed", consensusResult.policyId, settlement.error);

      if (settlement.attempts >= this.config.retryAttempts) {
        this.logger.error("Settlement permanently failed", {
          policyId: consensusResult.policyId.toString(),
          attempts: settlement.attempts,
          error: settlement.error,
        });

        // Remove from pending list after max retries
        this.pendingSettlements.delete(key);
      } else {
        this.logger.warn("Settlement failed, will retry", {
          policyId: consensusResult.policyId.toString(),
          attempt: settlement.attempts,
          maxAttempts: this.config.retryAttempts,
          error: settlement.error,
        });

        // Wait before retry
        setTimeout(() => {
          settlement.status = "pending";
        }, this.config.retryDelay);
      }

      throw error;
    }
  }

  /**
   * Get settlement status
   */
  getSettlementStatus(policyId: bigint, requestId: string): SettlementTransaction | null {
    const key = `${policyId}-${requestId}`;
    return this.pendingSettlements.get(key) || null;
  }

  /**
   * Get all pending settlements
   */
  getPendingSettlements(): SettlementTransaction[] {
    return Array.from(this.pendingSettlements.values());
  }

  /**
   * Get settlement statistics
   */
  getStatistics(): {
    pending: number;
    failed: number;
    retrying: number;
  } {
    const settlements = Array.from(this.pendingSettlements.values());

    return {
      pending: settlements.filter(s => s.status === "pending").length,
      failed: settlements.filter(s => s.status === "failed").length,
      retrying: settlements.filter(s => s.attempts > 1 && s.status !== "confirmed").length,
    };
  }
}

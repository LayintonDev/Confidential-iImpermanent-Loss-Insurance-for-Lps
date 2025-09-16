import { EventEmitter } from "events";
import { ethers } from "ethers";
import { ECDSASignatureAggregator, ECDSASignature, AggregatedSignature } from "./ECDSASignatureAggregator";
import { Logger } from "../utils/Logger";
import { AttestationRequest, ConsensusResult } from "../interfaces";

/**
 * Consensus session for tracking a single attestation request
 */
export interface ConsensusSession {
  requestId: string;
  policyId: bigint;
  attestationRequest: AttestationRequest;
  signatures: Map<string, ECDSASignature>;
  startTime: number;
  timeout: number;
  status: "pending" | "completed" | "failed" | "timeout";
}

/**
 * Events emitted by the consensus manager
 */
export interface ConsensusManagerEvents {
  "signature-received": (requestId: string, signature: ECDSASignature) => void;
  "consensus-reached": (
    requestId: string,
    result: ConsensusResult,
    attestationRequest: AttestationRequest,
    signatures: Map<string, ECDSASignature>
  ) => void;
  "consensus-failed": (requestId: string, reason: string) => void;
  "consensus-timeout": (requestId: string) => void;
}

/**
 * Manages consensus coordination for multiple attestation requests
 */
export class ConsensusManager extends EventEmitter {
  private sessions: Map<string, ConsensusSession> = new Map();
  private signatureAggregator: ECDSASignatureAggregator;
  private logger: Logger;
  private defaultTimeout: number = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(threshold: number = 1, defaultTimeout: number = 300000, logger?: Logger) {
    super();
    this.signatureAggregator = new ECDSASignatureAggregator(threshold, logger);
    this.logger = logger || new Logger({ level: "info" });
    this.defaultTimeout = defaultTimeout;

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Check if a consensus session exists
   */
  hasSession(requestId: string): boolean {
    return this.sessions.has(requestId);
  }

  /**
   * Start a new consensus session for an attestation request
   * @param request The attestation request
   * @param timeout Optional timeout in milliseconds
   * @returns The created session
   */
  startConsensusSession(request: AttestationRequest, timeout?: number): ConsensusSession {
    const sessionTimeout = timeout || this.defaultTimeout;

    const session: ConsensusSession = {
      requestId: request.requestId,
      policyId: request.policyId,
      attestationRequest: request,
      signatures: new Map(),
      startTime: Date.now(),
      timeout: sessionTimeout,
      status: "pending",
    };

    this.sessions.set(request.requestId, session);

    this.logger.info("Started consensus session", {
      requestId: request.requestId,
      policyId: request.policyId.toString(),
      timeout: sessionTimeout,
      threshold: this.signatureAggregator.getThreshold(),
    });

    // Set timeout for this session
    setTimeout(() => {
      this.handleSessionTimeout(request.requestId);
    }, sessionTimeout);

    return session;
  }

  /**
   * Submit a signature for a consensus session
   * @param requestId The request ID
   * @param signature The operator signature
   * @returns Whether the signature was accepted
   */
  async submitSignature(requestId: string, signature: ECDSASignature): Promise<boolean> {
    const session = this.sessions.get(requestId);
    if (!session) {
      this.logger.warn("Signature submitted for unknown session", { requestId });
      return false;
    }

    if (session.status !== "pending") {
      this.logger.warn("Signature submitted for non-pending session", {
        requestId,
        status: session.status,
      });
      return false;
    }

    // Check if we already have a signature from this operator
    if (session.signatures.has(signature.signer)) {
      this.logger.warn("Duplicate signature from operator", {
        requestId,
        signer: signature.signer,
      });
      return false;
    }

    // Verify the signature is for the correct message
    const expectedMessage = this.createConsensusMessage(session.attestationRequest);
    if (signature.message !== expectedMessage) {
      this.logger.warn("Signature message mismatch", {
        requestId,
        signer: signature.signer,
        expected: expectedMessage,
        received: signature.message,
      });
      return false;
    }

    // Add signature to session
    session.signatures.set(signature.signer, signature);

    this.logger.info("Signature accepted for consensus", {
      requestId,
      signer: signature.signer,
      totalSignatures: session.signatures.size,
      threshold: this.signatureAggregator.getThreshold(),
    });

    this.emit("signature-received", requestId, signature);

    // Check if we have reached consensus
    await this.checkConsensus(requestId);

    return true;
  }

  /**
   * Check if a consensus session has reached threshold
   * @param requestId The request ID to check
   */
  private async checkConsensus(requestId: string): Promise<void> {
    const session = this.sessions.get(requestId);
    if (!session || session.status !== "pending") {
      return;
    }

    const signatureCount = session.signatures.size;
    const threshold = this.signatureAggregator.getThreshold();

    if (signatureCount >= threshold) {
      try {
        // Aggregate signatures
        const signatures = Array.from(session.signatures.values());
        const message = this.createConsensusMessage(session.attestationRequest);

        const aggregated = await this.signatureAggregator.aggregateSignatures(signatures, message);

        // Verify aggregated signature
        const verification = await this.signatureAggregator.verifyAggregatedSignature(aggregated);

        if (verification.consensus) {
          // Consensus reached
          session.status = "completed";

          const consensusResult: ConsensusResult = {
            policyId: session.policyId,
            approved: true,
            aggregatedSignature: aggregated.aggregatedData,
            participatingOperators: aggregated.participatingOperators,
            threshold,
            requestId,
          };

          this.logger.info("Consensus reached", {
            requestId,
            policyId: session.policyId.toString(),
            operators: aggregated.participatingOperators.length,
            validSignatures: verification.validSignatures,
          });

          this.emit("consensus-reached", requestId, consensusResult, session.attestationRequest, session.signatures);
        } else {
          // Consensus failed due to invalid signatures
          session.status = "failed";
          const reason = `Invalid signatures: ${verification.invalidSignatures.join(", ")}`;

          this.logger.warn("Consensus failed due to invalid signatures", {
            requestId,
            invalidSignatures: verification.invalidSignatures,
            validSignatures: verification.validSignatures,
          });

          this.emit("consensus-failed", requestId, reason);
        }
      } catch (error) {
        session.status = "failed";
        const reason = error instanceof Error ? error.message : "Unknown error";

        this.logger.error("Consensus processing failed", {
          requestId,
          error: reason,
        });

        this.emit("consensus-failed", requestId, reason);
      }
    }
  }

  /**
   * Handle session timeout
   * @param requestId The request ID that timed out
   */
  private handleSessionTimeout(requestId: string): void {
    const session = this.sessions.get(requestId);
    if (!session || session.status !== "pending") {
      return;
    }

    session.status = "timeout";

    this.logger.warn("Consensus session timed out", {
      requestId,
      policyId: session.policyId.toString(),
      signatures: session.signatures.size,
      threshold: this.signatureAggregator.getThreshold(),
      elapsed: Date.now() - session.startTime,
    });

    this.emit("consensus-timeout", requestId);
  }

  /**
   * Create the consensus message for an attestation request
   * @param request The attestation request
   * @returns The message to be signed by operators
   */
  private createConsensusMessage(request: AttestationRequest): string {
    // Create a deterministic message for consensus
    const messageData = {
      policyId: request.policyId.toString(),
      payout: request.payout.toString(),
      timestamp: request.timestamp,
      fhenixSignature: request.fhenixSignature,
    };

    return JSON.stringify(messageData);
  }

  /**
   * Get consensus session information
   * @param requestId The request ID
   * @returns Session information or null if not found
   */
  getSession(requestId: string): ConsensusSession | null {
    return this.sessions.get(requestId) || null;
  }

  /**
   * Get all active sessions
   * @returns Array of pending sessions
   */
  getActiveSessions(): ConsensusSession[] {
    return Array.from(this.sessions.values()).filter(session => session.status === "pending");
  }

  /**
   * Update the signature threshold
   * @param newThreshold New threshold value
   */
  updateThreshold(newThreshold: number): void {
    this.signatureAggregator.updateThreshold(newThreshold);

    this.logger.info("Consensus threshold updated", {
      newThreshold,
      activeSessions: this.getActiveSessions().length,
    });
  }

  /**
   * Get current threshold
   * @returns Current threshold value
   */
  getThreshold(): number {
    return this.signatureAggregator.getThreshold();
  }

  /**
   * Start periodic cleanup of old sessions
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up old completed/failed sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let cleaned = 0;

    for (const [requestId, session] of this.sessions.entries()) {
      if (session.status !== "pending" && now - session.startTime > maxAge) {
        this.sessions.delete(requestId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug("Cleaned up old consensus sessions", {
        cleaned,
        remaining: this.sessions.size,
      });
    }
  }

  /**
   * Stop the consensus manager and cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Mark all pending sessions as failed
    for (const session of this.sessions.values()) {
      if (session.status === "pending") {
        session.status = "failed";
        this.emit("consensus-failed", session.requestId, "Consensus manager stopped");
      }
    }

    this.sessions.clear();
    this.removeAllListeners();

    this.logger.info("Consensus manager stopped");
  }

  /**
   * Clean up resources and stop the consensus manager
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Mark all pending sessions as failed
    for (const session of this.sessions.values()) {
      if (session.status === "pending") {
        session.status = "failed";
        this.emit("consensus-failed", session.requestId, "Consensus manager stopped");
      }
    }

    this.sessions.clear();
    this.removeAllListeners();

    this.logger.info("Consensus manager cleaned up");
  }
}

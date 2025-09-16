import { ethers } from "ethers";
import { EventEmitter } from "events";
import { ConsensusResult, AttestationRequest, IAVSManagerContract } from "../interfaces";
import { Logger } from "../utils/Logger";

/**
 * Types of slashing events
 */
export enum SlashingReason {
  INVALID_SIGNATURE = "invalid_signature",
  MALICIOUS_ATTESTATION = "malicious_attestation",
  DOUBLE_SIGNING = "double_signing",
  UNAVAILABILITY = "unavailability",
  CHALLENGE_FAILURE = "challenge_failure",
}

/**
 * Slashing evidence data
 */
export interface SlashingEvidence {
  reason: SlashingReason;
  operatorAddress: string;
  policyId: bigint;
  requestId: string;
  evidence: string; // JSON-encoded evidence
  timestamp: number;
  reporter: string;
}

/**
 * Challenge against an operator
 */
export interface Challenge {
  id: string;
  challengerAddress: string;
  targetOperator: string;
  policyId: bigint;
  requestId: string;
  evidence: SlashingEvidence;
  status: "pending" | "resolved" | "expired";
  responseDeadline: number;
  createdAt: number;
  response?: string;
  resolution?: "upheld" | "dismissed";
}

/**
 * Fraud detection result
 */
export interface FraudDetectionResult {
  isFraudulent: boolean;
  confidence: number; // 0-1
  reason: SlashingReason;
  evidence: string;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Slashing configuration
 */
export interface SlashingConfig {
  challengePeriod: number; // Time to respond to challenges in ms
  minimalSlashingAmount: bigint;
  fraudDetectionThreshold: number; // Confidence threshold for automatic slashing
  maxChallengesPerOperator: number;
  challengeCooldown: number; // Cooldown between challenges in ms
}

/**
 * Slashing service events
 */
export interface SlashingServiceEvents {
  "fraud-detected": (evidence: SlashingEvidence, result: FraudDetectionResult) => void;
  "challenge-created": (challenge: Challenge) => void;
  "challenge-resolved": (challengeId: string, resolution: "upheld" | "dismissed") => void;
  "operator-slashed": (operatorAddress: string, amount: bigint, reason: SlashingReason) => void;
  "slashing-failed": (operatorAddress: string, reason: string) => void;
}

/**
 * Advanced slashing mechanism with fraud detection and challenge-response system
 */
export class SlashingService extends EventEmitter {
  private avsManager: IAVSManagerContract;
  private wallet: ethers.Wallet;
  private logger: Logger;
  private config: SlashingConfig;
  private challenges: Map<string, Challenge> = new Map();
  private operatorChallenges: Map<string, number> = new Map(); // Track challenge count per operator
  private lastChallengeTime: Map<string, number> = new Map(); // Track last challenge time per operator
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(avsManager: IAVSManagerContract, wallet: ethers.Wallet, config: SlashingConfig, logger?: Logger) {
    super();
    this.avsManager = avsManager;
    this.wallet = wallet;
    this.config = config;
    this.logger = logger || new Logger({ level: "info" });

    // Start cleanup timer for expired challenges
    this.startCleanupTimer();
  }

  /**
   * Analyze consensus result for potential fraud
   */
  async analyzeFraud(
    consensusResult: ConsensusResult,
    attestationRequest: AttestationRequest,
    allSignatures: Map<string, any>
  ): Promise<FraudDetectionResult[]> {
    const results: FraudDetectionResult[] = [];

    try {
      // Check for signature validity
      for (const operatorAddress of consensusResult.participatingOperators) {
        const signature = allSignatures.get(operatorAddress);
        if (!signature) continue;

        // Verify signature authenticity
        const signatureValid = await this.verifySignature(attestationRequest, signature, operatorAddress);

        if (!signatureValid) {
          results.push({
            isFraudulent: true,
            confidence: 0.95,
            reason: SlashingReason.INVALID_SIGNATURE,
            evidence: JSON.stringify({
              operator: operatorAddress,
              signature: signature,
              expectedSigner: operatorAddress,
            }),
            severity: "high",
          });
        }

        // Check for double signing (same operator signing conflicting attestations)
        const doubleSigningEvidence = await this.detectDoubleSigning(operatorAddress, attestationRequest, signature);

        if (doubleSigningEvidence) {
          results.push({
            isFraudulent: true,
            confidence: 0.98,
            reason: SlashingReason.DOUBLE_SIGNING,
            evidence: JSON.stringify(doubleSigningEvidence),
            severity: "critical",
          });
        }

        // Check for malicious attestation patterns
        const maliciousPattern = await this.detectMaliciousAttestation(
          operatorAddress,
          attestationRequest,
          consensusResult
        );

        if (maliciousPattern) {
          results.push({
            isFraudulent: true,
            confidence: maliciousPattern.confidence,
            reason: SlashingReason.MALICIOUS_ATTESTATION,
            evidence: JSON.stringify(maliciousPattern.evidence),
            severity: maliciousPattern.severity,
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error("Fraud analysis failed", error);
      return [];
    }
  }

  /**
   * Create a challenge against an operator
   */
  async createChallenge(
    challengerAddress: string,
    targetOperator: string,
    evidence: SlashingEvidence
  ): Promise<Challenge | null> {
    try {
      // Check cooldown period
      const lastChallenge = this.lastChallengeTime.get(targetOperator) || 0;
      if (Date.now() - lastChallenge < this.config.challengeCooldown) {
        this.logger.warn("Challenge creation blocked by cooldown", {
          targetOperator,
          cooldownRemaining: this.config.challengeCooldown - (Date.now() - lastChallenge),
        });
        return null;
      }

      // Check maximum challenges per operator
      const challengeCount = this.operatorChallenges.get(targetOperator) || 0;
      if (challengeCount >= this.config.maxChallengesPerOperator) {
        this.logger.warn("Maximum challenges reached for operator", {
          targetOperator,
          challengeCount,
        });
        return null;
      }

      const challengeId = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "string", "uint256", "uint256"],
          [challengerAddress, targetOperator, evidence.policyId, Date.now()]
        )
      );

      const challenge: Challenge = {
        id: challengeId,
        challengerAddress,
        targetOperator,
        policyId: evidence.policyId,
        requestId: evidence.requestId,
        evidence,
        status: "pending",
        responseDeadline: Date.now() + this.config.challengePeriod,
        createdAt: Date.now(),
      };

      this.challenges.set(challengeId, challenge);
      this.operatorChallenges.set(targetOperator, challengeCount + 1);
      this.lastChallengeTime.set(targetOperator, Date.now());

      this.logger.info("Challenge created", {
        challengeId,
        challengerAddress,
        targetOperator,
        reason: evidence.reason,
      });

      this.emit("challenge-created", challenge);

      // Submit challenge to contract
      await this.avsManager.challengeAttestation(evidence.policyId, evidence.evidence);

      return challenge;
    } catch (error) {
      this.logger.error("Failed to create challenge", error);
      return null;
    }
  }

  /**
   * Respond to a challenge
   */
  async respondToChallenge(challengeId: string, response: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      this.logger.warn("Challenge not found", { challengeId });
      return false;
    }

    if (challenge.status !== "pending") {
      this.logger.warn("Challenge not in pending status", {
        challengeId,
        status: challenge.status,
      });
      return false;
    }

    if (Date.now() > challenge.responseDeadline) {
      this.logger.warn("Challenge response deadline exceeded", { challengeId });
      challenge.status = "expired";
      await this.processExpiredChallenge(challenge);
      return false;
    }

    challenge.response = response;

    // Evaluate the response
    const resolution = await this.evaluateChallengeResponse(challenge, response);
    challenge.resolution = resolution;
    challenge.status = "resolved";

    this.logger.info("Challenge resolved", {
      challengeId,
      resolution,
      targetOperator: challenge.targetOperator,
    });

    this.emit("challenge-resolved", challengeId, resolution);

    // Apply penalties if challenge is upheld
    if (resolution === "upheld") {
      await this.executeSlashing(challenge.targetOperator, challenge.evidence.reason, challenge.evidence.policyId);
    }

    return true;
  }

  /**
   * Execute slashing for an operator
   */
  private async executeSlashing(operatorAddress: string, reason: SlashingReason, policyId: bigint): Promise<void> {
    try {
      // Calculate slashing amount based on severity
      const slashingAmount = this.calculateSlashingAmount(reason);

      if (slashingAmount < this.config.minimalSlashingAmount) {
        this.logger.info("Slashing amount below minimum threshold", {
          operatorAddress,
          amount: slashingAmount.toString(),
          minimum: this.config.minimalSlashingAmount.toString(),
        });
        return;
      }

      this.logger.info("Executing slashing", {
        operatorAddress,
        reason,
        amount: slashingAmount.toString(),
        policyId: policyId.toString(),
      });

      // In a real implementation, this would call the slashing contract
      // For MVP, we'll emit an event
      this.emit("operator-slashed", operatorAddress, slashingAmount, reason);

      this.logger.info("Operator slashed successfully", {
        operatorAddress,
        reason,
        amount: slashingAmount.toString(),
      });
    } catch (error) {
      this.logger.error("Slashing execution failed", error);
      this.emit("slashing-failed", operatorAddress, (error as Error).message);
    }
  }

  /**
   * Verify signature authenticity
   */
  private async verifySignature(request: AttestationRequest, signature: any, expectedSigner: string): Promise<boolean> {
    try {
      // Create message hash
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "uint256", "string", "uint256", "string"],
          [request.policyId, request.payout, request.fhenixSignature, request.timestamp, request.requestId]
        )
      );

      // Recover signer from signature
      const recoveredSigner = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

      return recoveredSigner.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
      this.logger.error("Signature verification failed", error);
      return false;
    }
  }

  /**
   * Detect double signing by same operator
   */
  private async detectDoubleSigning(
    operatorAddress: string,
    request: AttestationRequest,
    signature: any
  ): Promise<any | null> {
    // In a real implementation, this would check against a database of previous signatures
    // For MVP, we'll return null (no double signing detected)
    return null;
  }

  /**
   * Detect malicious attestation patterns
   */
  private async detectMaliciousAttestation(
    operatorAddress: string,
    request: AttestationRequest,
    consensusResult: ConsensusResult
  ): Promise<{ confidence: number; evidence: any; severity: "low" | "medium" | "high" | "critical" } | null> {
    // Example fraud detection logic

    // Check for unusually high payout attestations
    if (request.payout > BigInt("1000000000000000000000")) {
      // 1000 ETH
      return {
        confidence: 0.7,
        evidence: {
          operator: operatorAddress,
          payout: request.payout.toString(),
          reason: "Unusually high payout amount",
        },
        severity: "medium",
      };
    }

    // Check for rapid sequential attestations (potential bot behavior)
    // This would require tracking attestation history

    return null;
  }

  /**
   * Evaluate challenge response
   */
  private async evaluateChallengeResponse(challenge: Challenge, response: string): Promise<"upheld" | "dismissed"> {
    try {
      // Parse response
      const responseData = JSON.parse(response);

      // Basic validation - in a real system this would be more sophisticated
      if (responseData.evidence && responseData.explanation) {
        // Check if the response provides sufficient counter-evidence
        if (responseData.evidence.length > 100) {
          // Arbitrary threshold
          return "dismissed";
        }
      }

      return "upheld";
    } catch (error) {
      this.logger.error("Failed to evaluate challenge response", error);
      return "upheld"; // Default to upholding challenge if response is invalid
    }
  }

  /**
   * Process expired challenge
   */
  private async processExpiredChallenge(challenge: Challenge): Promise<void> {
    this.logger.info("Processing expired challenge", {
      challengeId: challenge.id,
      targetOperator: challenge.targetOperator,
    });

    // Expired challenges are automatically upheld
    challenge.resolution = "upheld";
    challenge.status = "resolved";

    this.emit("challenge-resolved", challenge.id, "upheld");

    await this.executeSlashing(challenge.targetOperator, challenge.evidence.reason, challenge.evidence.policyId);
  }

  /**
   * Calculate slashing amount based on reason
   */
  private calculateSlashingAmount(reason: SlashingReason): bigint {
    const baseAmount = BigInt("1000000000000000000"); // 1 ETH

    switch (reason) {
      case SlashingReason.DOUBLE_SIGNING:
        return baseAmount * BigInt(10); // 10 ETH
      case SlashingReason.MALICIOUS_ATTESTATION:
        return baseAmount * BigInt(5); // 5 ETH
      case SlashingReason.INVALID_SIGNATURE:
        return baseAmount * BigInt(2); // 2 ETH
      case SlashingReason.CHALLENGE_FAILURE:
        return baseAmount * BigInt(3); // 3 ETH
      case SlashingReason.UNAVAILABILITY:
        return baseAmount; // 1 ETH
      default:
        return baseAmount;
    }
  }

  /**
   * Start cleanup timer for expired challenges
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredChallenges();
    }, 300000); // Check every 5 minutes
  }

  /**
   * Cleanup expired challenges
   */
  private cleanupExpiredChallenges(): void {
    const now = Date.now();
    const expired: Challenge[] = [];

    for (const challenge of this.challenges.values()) {
      if (challenge.status === "pending" && now > challenge.responseDeadline) {
        challenge.status = "expired";
        expired.push(challenge);
      }
    }

    for (const challenge of expired) {
      this.processExpiredChallenge(challenge);
    }

    this.logger.info("Cleanup completed", { expiredChallenges: expired.length });
  }

  /**
   * Get challenge by ID
   */
  getChallenge(challengeId: string): Challenge | null {
    return this.challenges.get(challengeId) || null;
  }

  /**
   * Get all challenges for an operator
   */
  getChallengesForOperator(operatorAddress: string): Challenge[] {
    return Array.from(this.challenges.values()).filter(c => c.targetOperator === operatorAddress);
  }

  /**
   * Get slashing statistics
   */
  getStatistics(): {
    totalChallenges: number;
    pendingChallenges: number;
    resolvedChallenges: number;
    expiredChallenges: number;
  } {
    const challenges = Array.from(this.challenges.values());

    return {
      totalChallenges: challenges.length,
      pendingChallenges: challenges.filter(c => c.status === "pending").length,
      resolvedChallenges: challenges.filter(c => c.status === "resolved").length,
      expiredChallenges: challenges.filter(c => c.status === "expired").length,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.challenges.clear();
    this.operatorChallenges.clear();
    this.lastChallengeTime.clear();
    this.removeAllListeners();

    this.logger.info("Slashing service cleaned up");
  }
}

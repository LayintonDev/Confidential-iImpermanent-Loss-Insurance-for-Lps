import { bls12_381 as bls } from "@noble/curves/bls12-381";
import { sha256 } from "@noble/hashes/sha256";
import { Logger } from "../utils/Logger";

/**
 * BLS Signature Aggregation for EigenLayer AVS
 * Implements BLS12-381 signature scheme for efficient multi-signature aggregation
 */
export class BLSSignatureAggregator {
  private logger: Logger;
  private threshold: number;
  private signatures: Map<string, { signature: Uint8Array; publicKey: Uint8Array; operator: string }> = new Map();
  private aggregatedSignature: Uint8Array | null = null;
  private aggregatedPublicKey: Uint8Array | null = null;

  constructor(threshold: number, logger: Logger) {
    this.threshold = threshold;
    this.logger = logger;
  }

  /**
   * Generate BLS key pair for an operator
   */
  static generateKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
    const privateKey = bls.utils.randomPrivateKey();
    const publicKey = bls.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }

  /**
   * Sign a message using BLS private key
   */
  static signMessage(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return bls.sign(message, privateKey);
  }

  /**
   * Verify a BLS signature
   */
  static verifySignature(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    try {
      return bls.verify(signature, message, publicKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * Add a signature to the aggregation pool
   */
  addSignature(operator: string, signature: Uint8Array, publicKey: Uint8Array, message: Uint8Array): boolean {
    try {
      // Verify the signature first
      if (!BLSSignatureAggregator.verifySignature(signature, message, publicKey)) {
        this.logger.error("Invalid BLS signature from operator", { operator });
        return false;
      }

      // Store the signature
      this.signatures.set(operator, { signature, publicKey, operator });

      this.logger.info("BLS signature added", {
        operator,
        totalSignatures: this.signatures.size,
        threshold: this.threshold,
      });

      // Check if we have enough signatures to aggregate
      if (this.signatures.size >= this.threshold) {
        this.aggregateSignatures();
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("Failed to add BLS signature", { operator, error });
      return false;
    }
  }

  /**
   * Aggregate all collected signatures
   */
  private aggregateSignatures(): void {
    try {
      if (this.signatures.size < this.threshold) {
        throw new Error("Insufficient signatures for aggregation");
      }

      const signatures: Uint8Array[] = [];
      const publicKeys: Uint8Array[] = [];

      for (const { signature, publicKey } of this.signatures.values()) {
        signatures.push(signature);
        publicKeys.push(publicKey);
      }

      // Aggregate signatures using BLS
      this.aggregatedSignature = bls.aggregateSignatures(signatures);
      this.aggregatedPublicKey = bls.aggregatePublicKeys(publicKeys);

      this.logger.info("BLS signatures aggregated successfully", {
        signatureCount: signatures.length,
        threshold: this.threshold,
      });
    } catch (error) {
      this.logger.error("Failed to aggregate BLS signatures", error);
      throw error;
    }
  }

  /**
   * Verify the aggregated signature
   */
  verifyAggregatedSignature(message: Uint8Array): boolean {
    if (!this.aggregatedSignature || !this.aggregatedPublicKey) {
      return false;
    }

    try {
      return bls.verify(this.aggregatedSignature, message, this.aggregatedPublicKey);
    } catch (error) {
      this.logger.error("Failed to verify aggregated signature", error);
      return false;
    }
  }

  /**
   * Get the aggregated signature
   */
  getAggregatedSignature(): Uint8Array | null {
    return this.aggregatedSignature;
  }

  /**
   * Get the aggregated public key
   */
  getAggregatedPublicKey(): Uint8Array | null {
    return this.aggregatedPublicKey;
  }

  /**
   * Get the list of participating operators
   */
  getParticipatingOperators(): string[] {
    return Array.from(this.signatures.keys());
  }

  /**
   * Check if threshold is met
   */
  isThresholdMet(): boolean {
    return this.signatures.size >= this.threshold;
  }

  /**
   * Reset the aggregator for a new round
   */
  reset(): void {
    this.signatures.clear();
    this.aggregatedSignature = null;
    this.aggregatedPublicKey = null;
  }

  /**
   * Create message hash for signing
   */
  static createMessageHash(policyId: bigint, payout: bigint, taskIndex: number): Uint8Array {
    const message = new TextEncoder().encode(
      JSON.stringify({
        policyId: policyId.toString(),
        payout: payout.toString(),
        taskIndex,
        timestamp: Date.now(),
      })
    );
    return sha256(message);
  }

  /**
   * Serialize aggregated signature for on-chain submission
   */
  serializeAggregatedSignature(): string {
    if (!this.aggregatedSignature) {
      throw new Error("No aggregated signature available");
    }
    return "0x" + Buffer.from(this.aggregatedSignature).toString("hex");
  }

  /**
   * Serialize aggregated public key
   */
  serializeAggregatedPublicKey(): string {
    if (!this.aggregatedPublicKey) {
      throw new Error("No aggregated public key available");
    }
    return "0x" + Buffer.from(this.aggregatedPublicKey).toString("hex");
  }

  /**
   * Get signature statistics
   */
  getStats(): {
    totalSignatures: number;
    threshold: number;
    isThresholdMet: boolean;
    participatingOperators: string[];
  } {
    return {
      totalSignatures: this.signatures.size,
      threshold: this.threshold,
      isThresholdMet: this.isThresholdMet(),
      participatingOperators: this.getParticipatingOperators(),
    };
  }
}

/**
 * BLS Utilities for EigenLayer integration
 */
export class BLSUtils {
  /**
   * Convert private key to hex string
   */
  static privateKeyToHex(privateKey: Uint8Array): string {
    return "0x" + Buffer.from(privateKey).toString("hex");
  }

  /**
   * Convert public key to hex string
   */
  static publicKeyToHex(publicKey: Uint8Array): string {
    return "0x" + Buffer.from(publicKey).toString("hex");
  }

  /**
   * Convert hex string to Uint8Array
   */
  static hexToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    return new Uint8Array(Buffer.from(cleanHex, "hex"));
  }

  /**
   * Validate BLS public key format
   */
  static isValidPublicKey(publicKey: Uint8Array): boolean {
    try {
      // BLS12-381 G1 point should be 48 bytes
      return publicKey.length === 48;
    } catch {
      return false;
    }
  }

  /**
   * Validate BLS signature format
   */
  static isValidSignature(signature: Uint8Array): boolean {
    try {
      // BLS12-381 G2 point should be 96 bytes
      return signature.length === 96;
    } catch {
      return false;
    }
  }

  /**
   * Generate operator ID from public key
   */
  static generateOperatorId(publicKey: Uint8Array): string {
    const hash = sha256(publicKey);
    return "0x" + Buffer.from(hash).toString("hex");
  }
}

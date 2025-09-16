import { ethers } from "ethers";
import { Logger } from "../utils/Logger";

/**
 * ECDSA Signature Aggregation for MVP
 * In production, this would be replaced with BLS signature aggregation
 */

export interface ECDSASignature {
  r: string;
  s: string;
  v: number;
  signer: string;
  message: string;
}

export interface AggregatedSignature {
  signatures: ECDSASignature[];
  threshold: number;
  message: string;
  participatingOperators: string[];
  aggregatedData: string;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  validSignatures: number;
  invalidSignatures: string[];
  threshold: number;
  consensus: boolean;
}

/**
 * ECDSA-based signature aggregator for MVP implementation
 * This provides threshold signature verification without requiring BLS
 */
export class ECDSASignatureAggregator {
  private logger: Logger;
  private threshold: number;

  constructor(threshold: number = 1, logger?: Logger) {
    this.threshold = threshold;
    this.logger = logger || new Logger({ level: "info" });
  }

  /**
   * Aggregate multiple ECDSA signatures for threshold consensus
   * @param signatures Array of ECDSA signatures from different operators
   * @param message The original message that was signed
   * @returns Aggregated signature data
   */
  async aggregateSignatures(signatures: ECDSASignature[], message: string): Promise<AggregatedSignature> {
    this.logger.info("Aggregating ECDSA signatures", {
      signatureCount: signatures.length,
      threshold: this.threshold,
      messageHash: ethers.keccak256(ethers.toUtf8Bytes(message)).slice(0, 10) + "...",
    });

    // Verify all signatures are for the same message
    const invalidMessages = signatures.filter(sig => sig.message !== message);
    if (invalidMessages.length > 0) {
      throw new Error(`Message mismatch in signatures: ${invalidMessages.length} signatures have different messages`);
    }

    // Get unique signers
    const participatingOperators = [...new Set(signatures.map(sig => sig.signer))];

    // Create aggregated data (for MVP, this is a concatenation of signature data)
    const aggregatedData = this.createAggregatedData(signatures);

    const result: AggregatedSignature = {
      signatures,
      threshold: this.threshold,
      message,
      participatingOperators,
      aggregatedData,
    };

    this.logger.info("Signature aggregation completed", {
      totalSignatures: signatures.length,
      uniqueOperators: participatingOperators.length,
      meetsThreshold: participatingOperators.length >= this.threshold,
    });

    return result;
  }

  /**
   * Verify aggregated signatures meet threshold requirements
   * @param aggregated The aggregated signature data
   * @returns Verification result with consensus status
   */
  async verifyAggregatedSignature(aggregated: AggregatedSignature): Promise<SignatureVerificationResult> {
    this.logger.info("Verifying aggregated signature", {
      totalSignatures: aggregated.signatures.length,
      threshold: aggregated.threshold,
      operators: aggregated.participatingOperators.length,
    });

    const invalidSignatures: string[] = [];
    let validSignatures = 0;

    // Verify each individual signature
    for (const signature of aggregated.signatures) {
      try {
        const isValid = await this.verifyIndividualSignature(signature);
        if (isValid) {
          validSignatures++;
        } else {
          invalidSignatures.push(signature.signer);
        }
      } catch (error) {
        this.logger.warn("Signature verification failed", {
          signer: signature.signer,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        invalidSignatures.push(signature.signer);
      }
    }

    const consensus = validSignatures >= this.threshold;

    const result: SignatureVerificationResult = {
      isValid: consensus && invalidSignatures.length === 0,
      validSignatures,
      invalidSignatures,
      threshold: this.threshold,
      consensus,
    };

    this.logger.info("Aggregated signature verification completed", {
      validSignatures,
      invalidSignatures: invalidSignatures.length,
      consensus,
      meetsThreshold: consensus,
    });

    return result;
  }

  /**
   * Create a signature for a message using a private key
   * @param message The message to sign
   * @param privateKey The private key to sign with
   * @param signerAddress The address of the signer
   * @returns ECDSA signature
   */
  async createSignature(message: string, privateKey: string, signerAddress: string): Promise<ECDSASignature> {
    try {
      const wallet = new ethers.Wallet(privateKey);

      // Ensure the signer address matches the private key
      if (wallet.address.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error("Private key does not match signer address");
      }

      // Create message hash
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      const messageBytes = ethers.getBytes(messageHash);

      // Sign the message
      const signature = await wallet.signMessage(messageBytes);

      // Parse signature components
      const expandedSig = ethers.Signature.from(signature);

      const ecdsaSignature: ECDSASignature = {
        r: expandedSig.r,
        s: expandedSig.s,
        v: expandedSig.v,
        signer: signerAddress,
        message,
      };

      this.logger.debug("Created ECDSA signature", {
        signer: signerAddress,
        messageHash: messageHash.slice(0, 10) + "...",
        v: ecdsaSignature.v,
      });

      return ecdsaSignature;
    } catch (error) {
      this.logger.error("Failed to create signature", {
        signer: signerAddress,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Verify an individual ECDSA signature
   * @param signature The signature to verify
   * @returns Whether the signature is valid
   */
  private async verifyIndividualSignature(signature: ECDSASignature): Promise<boolean> {
    try {
      // Recreate the message hash
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(signature.message));
      const messageBytes = ethers.getBytes(messageHash);

      // Reconstruct the signature
      const fullSignature = ethers.Signature.from({
        r: signature.r,
        s: signature.s,
        v: signature.v,
      });

      // Recover the signer address
      const recoveredAddress = ethers.recoverAddress(messageBytes, fullSignature);

      // Verify the recovered address matches the claimed signer
      const isValid = recoveredAddress.toLowerCase() === signature.signer.toLowerCase();

      this.logger.debug("Individual signature verification", {
        signer: signature.signer,
        recovered: recoveredAddress,
        isValid,
      });

      return isValid;
    } catch (error) {
      this.logger.warn("Individual signature verification failed", {
        signer: signature.signer,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Create aggregated data from multiple signatures (MVP implementation)
   * @param signatures Array of signatures to aggregate
   * @returns Aggregated data string
   */
  private createAggregatedData(signatures: ECDSASignature[]): string {
    // For MVP, we create a simple concatenation of signature data
    // In production with BLS, this would be actual cryptographic aggregation
    const sortedSignatures = signatures.sort((a, b) => a.signer.toLowerCase().localeCompare(b.signer.toLowerCase()));

    const aggregatedComponents = sortedSignatures.map(sig => ({
      signer: sig.signer,
      r: sig.r,
      s: sig.s,
      v: sig.v,
    }));

    // Create a deterministic aggregated signature representation
    const aggregatedData = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(aggregatedComponents)));

    return aggregatedData;
  }

  /**
   * Update the signature threshold
   * @param newThreshold New threshold value
   */
  updateThreshold(newThreshold: number): void {
    if (newThreshold < 1) {
      throw new Error("Threshold must be at least 1");
    }

    this.logger.info("Updating signature threshold", {
      oldThreshold: this.threshold,
      newThreshold,
    });

    this.threshold = newThreshold;
  }

  /**
   * Get current threshold
   * @returns Current threshold value
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Check if signatures meet the current threshold
   * @param operatorCount Number of unique operators who signed
   * @returns Whether threshold is met
   */
  meetsThreshold(operatorCount: number): boolean {
    return operatorCount >= this.threshold;
  }
}

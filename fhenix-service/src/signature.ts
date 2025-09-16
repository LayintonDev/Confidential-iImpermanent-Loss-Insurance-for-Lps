import { ethers } from "ethers";

/**
 * Signature service for signing Fhenix attestations
 * In production, this would use proper FHE attestation format
 */
export class SignatureService {
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Sign a computation result
   * @param policyId Policy ID
   * @param payout Calculated payout amount
   * @param auditHash Hash of computation audit trail
   * @param workerId Worker identifier
   * @returns ECDSA signature (hex string)
   */
  async signAttestation(policyId: number, payout: string, auditHash: string, workerId: string): Promise<string> {
    // Create message to sign
    const messageData = { policyId, payout, auditHash, workerId };
    const message = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(messageData)));

    // Sign the message - ethers v6 syntax
    const signature = await this.wallet.signMessage(ethers.getBytes(message));

    return signature;
  }

  /**
   * Get the signer address
   * @returns Ethereum address of the signer
   */
  getSignerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Verify a signature
   * @param message Original message
   * @param signature Signature to verify
   * @returns True if signature is valid
   */
  verifySignature(message: string, signature: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), signature);
      return recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();
    } catch (error) {
      return false;
    }
  }
}

/**
 * Signature Aggregation Module
 *
 * This module provides signature aggregation and consensus management
 * for the EigenLayer AVS implementation.
 */

export {
  ECDSASignatureAggregator,
  ECDSASignature,
  AggregatedSignature,
  SignatureVerificationResult,
} from "./ECDSASignatureAggregator";

export { ConsensusManager, ConsensusSession, ConsensusManagerEvents } from "./ConsensusManager";

// Re-export for convenience
export type { AttestationRequest, ConsensusResult } from "../interfaces";

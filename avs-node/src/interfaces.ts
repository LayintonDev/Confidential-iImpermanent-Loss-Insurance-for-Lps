import { ethers } from "ethers";
import { EventEmitter } from "events";

/**
 * Core interfaces for AVS Node operations
 */

export interface OperatorConfig {
  privateKey: string;
  address: string;
  rpcUrl: string;
  avsManagerAddress: string;
  stake: bigint;
}

export interface AttestationRequest {
  policyId: bigint;
  fhenixSignature: string;
  payout: bigint;
  timestamp: number;
  requestId: string;
}

export interface AttestationResponse {
  policyId: bigint;
  operatorAddress: string;
  signature: string;
  approved: boolean;
  timestamp: number;
  requestId: string;
}

export interface ConsensusResult {
  policyId: bigint;
  approved: boolean;
  aggregatedSignature: string;
  participatingOperators: string[];
  threshold: number;
  requestId: string;
}

/**
 * Events emitted by AVS Node
 */
export interface AVSNodeEvents {
  "attestation-request": (request: AttestationRequest) => void;
  "attestation-response": (response: AttestationResponse) => void;
  "consensus-reached": (result: ConsensusResult) => void;
  "operator-registered": (address: string, stake: bigint) => void;
  "operator-slashed": (address: string, amount: bigint, reason: string) => void;
  "settlement-processed": (policyId: bigint, amount: bigint) => void;
  error: (error: Error) => void;
}

/**
 * Base interface for AVS Node implementation
 */
export interface IAVSNode extends EventEmitter {
  // Core functionality
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;

  // Operator management
  registerOperator(config: OperatorConfig): Promise<void>;
  deregisterOperator(): Promise<void>;
  updateStake(newStake: bigint): Promise<void>;

  // Attestation handling
  submitAttestation(request: AttestationRequest): Promise<AttestationResponse>;
  processAttestationRequest(request: AttestationRequest): Promise<void>;

  // Consensus participation
  participateInConsensus(request: AttestationRequest): Promise<void>;
  verifyConsensus(result: ConsensusResult): Promise<boolean>;

  // Settlement
  processSettlement(consensusResult: ConsensusResult): Promise<void>;

  // Status and monitoring
  getOperatorStatus(): Promise<{
    isActive: boolean;
    stake: bigint;
    slashingHistory: number;
  }>;
  getHealth(): Promise<{
    isHealthy: boolean;
    uptime: number;
    lastActivity: Date;
    errors: string[];
  }>;
}

/**
 * Configuration for AVS Node
 */
export interface AVSNodeConfig {
  operator: OperatorConfig;
  network: {
    chainId: number;
    rpcUrl: string;
    wsUrl?: string;
  };
  avs: {
    managerAddress: string;
    minimumStake: bigint;
    signatureThreshold: number;
  };
  consensus: {
    operatorCount: number;
    threshold: number;
    timeoutMs: number;
    maxRetries: number;
  };
  p2p: {
    port: number;
    peers: string[];
    maxConnections: number;
  };
  api: {
    enabled: boolean;
    port: number;
    cors: boolean;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    file?: string;
  };
}

/**
 * AVS Manager contract interface
 */
export interface IAVSManagerContract {
  registerOperator(stake: bigint): Promise<ethers.ContractTransactionResponse>;
  deregisterOperator(): Promise<ethers.ContractTransactionResponse>;
  updateOperatorStake(newStake: bigint): Promise<ethers.ContractTransactionResponse>;

  submitAttestation(
    policyId: bigint,
    fhenixSignature: string,
    ivsSignature: string,
    payout: bigint
  ): Promise<ethers.ContractTransactionResponse>;

  settleClaim(policyId: bigint, payout: bigint): Promise<ethers.ContractTransactionResponse>;
  rejectClaim(policyId: bigint, reason: string): Promise<ethers.ContractTransactionResponse>;
  challengeAttestation(policyId: bigint, evidence: string): Promise<ethers.ContractTransactionResponse>;

  getOperatorStatus(address: string): Promise<{
    isActive: boolean;
    stake: bigint;
    slashingHistory: bigint;
  }>;

  getSignatureThreshold(): Promise<bigint>;
  getActiveOperatorCount(): Promise<bigint>;
}

/**
 * P2P Network interface for operator communication
 */
export interface IP2PNetwork extends EventEmitter {
  start(): Promise<void>;
  stop(): Promise<void>;

  broadcast(message: any): Promise<void>;
  sendTo(peerId: string, message: any): Promise<void>;

  getPeers(): string[];
  isConnected(): boolean;
}

/**
 * Signature aggregation interface
 */
export interface ISignatureAggregator {
  aggregateSignatures(signatures: string[]): Promise<string>;
  verifyAggregatedSignature(message: string, aggregatedSignature: string, publicKeys: string[]): Promise<boolean>;

  // For ECDSA threshold signatures (MVP)
  aggregateECDSASignatures(signatures: string[]): Promise<string>;
  verifyECDSAThreshold(message: string, signatures: string[], threshold: number): Promise<boolean>;
}

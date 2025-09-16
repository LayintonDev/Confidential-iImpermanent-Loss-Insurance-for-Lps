# Backend Services Documentation

## Overview

The Confidential Impermanent Loss Insurance system includes several backend services that handle confidential computations, decentralized verification, and data indexing. This document provides comprehensive documentation for all backend components.

## Service Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Fhenix Service    │    │   AVS Node          │    │   Indexer Service   │
│   (Port 3001)       │    │   (EigenLayer)      │    │   (Data Aggregation)│
│                     │    │                     │    │                     │
│   • FHE Compute     │    │   • Claim Verify    │    │   • Event Monitor   │
│   • IL Calculation  │    │   • Consensus       │    │   • Data Analytics  │
│   • ZK Proofs       │    │   • Slashing        │    │   • API Endpoints   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                     ┌─────────────────────┐
                     │   Smart Contracts   │
                     │   (Ethereum)        │
                     └─────────────────────┘
```

---

## 1. Fhenix Service

**Location**: `fhenix-service/`

### Purpose

Handles confidential impermanent loss calculations using Fully Homomorphic Encryption (FHE), enabling privacy-preserving computations while maintaining verifiability.

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **FHE Library**: Fhenix SDK
- **Cryptography**: Web3 cryptographic primitives
- **Testing**: Jest

### Project Structure

```
fhenix-service/
├── src/
│   ├── app.ts              # Express application setup
│   ├── index.ts            # Main entry point
│   ├── ilCalculation.ts    # Core IL calculation logic
│   ├── signature.ts        # Cryptographic signatures
│   └── types.ts            # TypeScript type definitions
├── test/
│   └── api.test.ts         # API endpoint tests
├── package.json            # Dependencies and scripts
├── jest.config.js          # Jest testing configuration
└── tsconfig.json           # TypeScript configuration
```

### Core Components

#### 1. Express Application Setup

**File**: `src/app.ts`

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ilCalculationRouter } from "./ilCalculation";
import { signatureRouter } from "./signature";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API routes
app.use("/api/il", ilCalculationRouter);
app.use("/api/signature", signatureRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

export default app;
```

#### 2. IL Calculation Service

**File**: `src/ilCalculation.ts`

```typescript
import { Router } from "express";
import { FhenixClient, EncryptionTypes } from "fhenixjs";
import { keccak256, encodePacked } from "viem";

const router = Router();

interface ILCalculationRequest {
  policyId: string;
  encryptedPositionData: string;
  currentPriceData: PriceData;
  blockNumber?: number;
}

interface PriceData {
  token0Price: string;
  token1Price: string;
  timestamp: number;
  source: string;
}

interface ILCalculationResult {
  policyId: string;
  encryptedResult: string;
  proof: string;
  calculationId: string;
  timestamp: number;
}

// Initialize Fhenix client
const fhenixClient = new FhenixClient({
  provider: process.env.FHENIX_RPC_URL!,
  chainId: parseInt(process.env.FHENIX_CHAIN_ID!),
});

class ILCalculationService {
  private calculationCache = new Map<string, ILCalculationResult>();

  /**
   * Calculate impermanent loss using FHE
   */
  async calculateIL(request: ILCalculationRequest): Promise<ILCalculationResult> {
    try {
      // Validate input data
      this.validateCalculationRequest(request);

      // Decrypt position data in secure environment
      const positionData = await this.decryptPositionData(request.encryptedPositionData);

      // Perform IL calculation
      const ilResult = await this.performILCalculation(positionData, request.currentPriceData);

      // Encrypt result
      const encryptedResult = await this.encryptResult(ilResult);

      // Generate zero-knowledge proof
      const proof = await this.generateZKProof(positionData, ilResult);

      const result: ILCalculationResult = {
        policyId: request.policyId,
        encryptedResult,
        proof,
        calculationId: this.generateCalculationId(request),
        timestamp: Date.now(),
      };

      // Cache result
      this.calculationCache.set(result.calculationId, result);

      return result;
    } catch (error) {
      console.error("IL calculation failed:", error);
      throw new Error(`Calculation failed: ${error.message}`);
    }
  }

  /**
   * Validate calculation request parameters
   */
  private validateCalculationRequest(request: ILCalculationRequest): void {
    if (!request.policyId || typeof request.policyId !== "string") {
      throw new Error("Invalid policy ID");
    }

    if (!request.encryptedPositionData || typeof request.encryptedPositionData !== "string") {
      throw new Error("Invalid encrypted position data");
    }

    if (!request.currentPriceData || !this.isValidPriceData(request.currentPriceData)) {
      throw new Error("Invalid price data");
    }
  }

  /**
   * Decrypt position data using FHE
   */
  private async decryptPositionData(encryptedData: string): Promise<PositionData> {
    try {
      // Use Fhenix client to decrypt data
      const decrypted = await fhenixClient.decrypt(encryptedData);

      return {
        initialToken0: BigInt(decrypted.initialToken0),
        initialToken1: BigInt(decrypted.initialToken1),
        currentToken0: BigInt(decrypted.currentToken0),
        currentToken1: BigInt(decrypted.currentToken1),
        feesEarned: BigInt(decrypted.feesEarned),
        entryTimestamp: decrypted.entryTimestamp,
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Perform actual IL calculation
   */
  private async performILCalculation(positionData: PositionData, priceData: PriceData): Promise<ILResult> {
    // Convert price data to BigInt for precise calculations
    const currentPrice = BigInt(Math.floor(parseFloat(priceData.token0Price) * 1e18));

    // Calculate hodl value: V_hodl = x0 * P1 + y0
    const hodlValue = (positionData.initialToken0 * currentPrice) / BigInt(1e18) + positionData.initialToken1;

    // Calculate LP value: V_lp = x1 * P1 + y1 + fees
    const lpValue =
      (positionData.currentToken0 * currentPrice) / BigInt(1e18) + positionData.currentToken1 + positionData.feesEarned;

    // Calculate impermanent loss: IL = max(0, V_hodl - V_lp)
    const impermanentLoss = hodlValue > lpValue ? hodlValue - lpValue : BigInt(0);

    return {
      hodlValue,
      lpValue,
      impermanentLoss,
      currentPrice,
      calculationTimestamp: Date.now(),
    };
  }

  /**
   * Encrypt calculation result
   */
  private async encryptResult(result: ILResult): Promise<string> {
    try {
      const resultData = {
        hodlValue: result.hodlValue.toString(),
        lpValue: result.lpValue.toString(),
        impermanentLoss: result.impermanentLoss.toString(),
        currentPrice: result.currentPrice.toString(),
      };

      return await fhenixClient.encrypt(resultData, EncryptionTypes.uint256);
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Generate zero-knowledge proof for calculation
   */
  private async generateZKProof(positionData: PositionData, result: ILResult): Promise<string> {
    // This is a simplified proof generation
    // In a real implementation, this would use a proper ZK-SNARK library
    const proofInputs = {
      publicInputs: [result.impermanentLoss.toString(), result.calculationTimestamp.toString()],
      privateInputs: [
        positionData.initialToken0.toString(),
        positionData.initialToken1.toString(),
        positionData.currentToken0.toString(),
        positionData.currentToken1.toString(),
      ],
    };

    // Generate proof hash as placeholder
    const proofHash = keccak256(
      encodePacked(["string[]", "string[]"], [proofInputs.publicInputs, proofInputs.privateInputs])
    );

    return proofHash;
  }

  /**
   * Generate unique calculation ID
   */
  private generateCalculationId(request: ILCalculationRequest): string {
    return keccak256(
      encodePacked(
        ["string", "string", "uint256"],
        [request.policyId, request.encryptedPositionData, BigInt(Date.now())]
      )
    );
  }

  /**
   * Validate price data structure
   */
  private isValidPriceData(priceData: any): priceData is PriceData {
    return (
      priceData &&
      typeof priceData.token0Price === "string" &&
      typeof priceData.token1Price === "string" &&
      typeof priceData.timestamp === "number" &&
      typeof priceData.source === "string"
    );
  }

  /**
   * Get cached calculation result
   */
  getCachedResult(calculationId: string): ILCalculationResult | undefined {
    return this.calculationCache.get(calculationId);
  }
}

// Service instance
const ilService = new ILCalculationService();

// API Endpoints

/**
 * POST /api/il/calculate
 * Calculate impermanent loss for a policy
 */
router.post("/calculate", async (req, res) => {
  try {
    const request: ILCalculationRequest = req.body;
    const result = await ilService.calculateIL(request);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("IL calculation endpoint error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/il/result/:calculationId
 * Retrieve cached calculation result
 */
router.get("/result/:calculationId", (req, res) => {
  try {
    const { calculationId } = req.params;
    const result = ilService.getCachedResult(calculationId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Calculation result not found",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Result retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve result",
    });
  }
});

/**
 * POST /api/il/verify-proof
 * Verify zero-knowledge proof
 */
router.post("/verify-proof", async (req, res) => {
  try {
    const { proof, publicInputs } = req.body;

    // Verify proof logic
    const isValid = await verifyZKProof(proof, publicInputs);

    res.json({
      success: true,
      data: { valid: isValid },
    });
  } catch (error) {
    console.error("Proof verification error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function for proof verification
async function verifyZKProof(proof: string, publicInputs: string[]): Promise<boolean> {
  // Placeholder implementation
  // Real implementation would use proper ZK proof verification
  return proof.length > 0 && publicInputs.length > 0;
}

// Type definitions
interface PositionData {
  initialToken0: bigint;
  initialToken1: bigint;
  currentToken0: bigint;
  currentToken1: bigint;
  feesEarned: bigint;
  entryTimestamp: number;
}

interface ILResult {
  hodlValue: bigint;
  lpValue: bigint;
  impermanentLoss: bigint;
  currentPrice: bigint;
  calculationTimestamp: number;
}

export { router as ilCalculationRouter, ILCalculationService };
```

#### 3. Signature Service

**File**: `src/signature.ts`

```typescript
import { Router } from "express";
import { verifyMessage, recoverAddress, keccak256, encodePacked } from "viem";

const router = Router();

interface SignatureRequest {
  message: string;
  signature: string;
  expectedSigner?: string;
}

interface SignatureResult {
  valid: boolean;
  recoveredAddress: string;
  messageHash: string;
}

class SignatureService {
  /**
   * Verify cryptographic signature
   */
  async verifySignature(request: SignatureRequest): Promise<SignatureResult> {
    try {
      const messageHash = keccak256(encodePacked(["string"], [request.message]));
      const recoveredAddress = await recoverAddress({
        hash: messageHash,
        signature: request.signature as `0x${string}`,
      });

      const valid = request.expectedSigner
        ? recoveredAddress.toLowerCase() === request.expectedSigner.toLowerCase()
        : true;

      return {
        valid,
        recoveredAddress,
        messageHash,
      };
    } catch (error) {
      throw new Error(`Signature verification failed: ${error.message}`);
    }
  }

  /**
   * Sign message with private key
   */
  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      // Use wallet to sign message
      // This would typically be done on the client side
      // Included here for completeness
      throw new Error("Server-side signing not implemented for security reasons");
    } catch (error) {
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }
}

const signatureService = new SignatureService();

// API Endpoints

/**
 * POST /api/signature/verify
 * Verify cryptographic signature
 */
router.post("/verify", async (req, res) => {
  try {
    const request: SignatureRequest = req.body;
    const result = await signatureService.verifySignature(request);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Signature verification error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as signatureRouter, SignatureService };
```

### API Documentation

#### Calculate IL Endpoint

```http
POST /api/il/calculate
Content-Type: application/json

{
  "policyId": "123",
  "encryptedPositionData": "0x...",
  "currentPriceData": {
    "token0Price": "1500.50",
    "token1Price": "1.00",
    "timestamp": 1640995200,
    "source": "chainlink"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "policyId": "123",
    "encryptedResult": "0x...",
    "proof": "0x...",
    "calculationId": "calc_456",
    "timestamp": 1640995200
  }
}
```

#### Verify Proof Endpoint

```http
POST /api/il/verify-proof
Content-Type: application/json

{
  "proof": "0x...",
  "publicInputs": ["1000000000000000000", "1640995200"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

---

## 2. AVS Node (EigenLayer Operator)

**Location**: `avs-node/`

### Purpose

Implements an EigenLayer Actively Validated Service (AVS) node that validates insurance claims through decentralized consensus.

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Consensus**: EigenLayer AVS framework
- **Cryptography**: BLS signatures, ECDSA
- **Monitoring**: Event-driven architecture
- **Testing**: Jest with integration tests

### Project Structure

```
avs-node/
├── src/
│   ├── AVSNode.ts              # Main operator node
│   ├── AVSRegistry.ts          # Registry management
│   ├── interfaces.ts           # Type definitions
│   ├── services/
│   │   ├── SettlementService.ts    # Claim settlement
│   │   ├── SlashingService.ts      # Operator slashing
│   │   └── index.ts                # Service exports
│   ├── aggregation/
│   │   ├── ConsensusManager.ts         # Consensus coordination
│   │   ├── ECDSASignatureAggregator.ts # Signature aggregation
│   │   └── index.ts                    # Aggregation exports
│   └── utils/
│       └── Logger.ts               # Logging utilities
├── test/
│   ├── AVSNode.test.ts         # Unit tests
│   ├── integration.test.ts     # Integration tests
│   └── phase5-integration.test.ts  # Phase 5 tests
└── package.json
```

### Core Components

#### 1. AVS Node Implementation

**File**: `src/AVSNode.ts`

```typescript
import { EventEmitter } from "events";
import { Address, Hash, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { AVSRegistry } from "./AVSRegistry";
import { SettlementService } from "./services/SettlementService";
import { SlashingService } from "./services/SlashingService";
import { ConsensusManager } from "./aggregation/ConsensusManager";
import { Logger } from "./utils/Logger";

interface OperatorConfig {
  operatorAddress: Address;
  privateKey: string;
  eigenLayerAddress: Address;
  avsManagerAddress: Address;
  stakingToken: Address;
  minStake: bigint;
}

interface TaskData {
  taskIndex: number;
  policyId: bigint;
  claimHash: Hash;
  blockNumber: number;
  quorumThreshold: number;
}

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason?: string;
  evidence?: any;
}

export class AVSNode extends EventEmitter {
  private config: OperatorConfig;
  private registry: AVSRegistry;
  private settlementService: SettlementService;
  private slashingService: SlashingService;
  private consensusManager: ConsensusManager;
  private logger: Logger;
  private isRunning = false;
  private activeTasks = new Map<number, TaskData>();

  constructor(config: OperatorConfig) {
    super();
    this.config = config;
    this.logger = new Logger("AVSNode");

    // Initialize services
    this.registry = new AVSRegistry(config);
    this.settlementService = new SettlementService(config);
    this.slashingService = new SlashingService(config);
    this.consensusManager = new ConsensusManager(config);
  }

  /**
   * Start the AVS node
   */
  async start(): Promise<void> {
    try {
      this.logger.info("Starting AVS Node...");

      // Register operator with EigenLayer
      await this.registry.registerOperator();

      // Start consensus manager
      await this.consensusManager.start();

      // Start event monitoring
      await this.startEventMonitoring();

      this.isRunning = true;
      this.logger.info("AVS Node started successfully");

      this.emit("started");
    } catch (error) {
      this.logger.error("Failed to start AVS Node:", error);
      throw error;
    }
  }

  /**
   * Stop the AVS node
   */
  async stop(): Promise<void> {
    try {
      this.logger.info("Stopping AVS Node...");

      this.isRunning = false;

      // Stop event monitoring
      await this.stopEventMonitoring();

      // Stop consensus manager
      await this.consensusManager.stop();

      this.logger.info("AVS Node stopped");
      this.emit("stopped");
    } catch (error) {
      this.logger.error("Error stopping AVS Node:", error);
      throw error;
    }
  }

  /**
   * Validate an insurance claim
   */
  async validateClaim(taskData: TaskData): Promise<ValidationResult> {
    this.logger.info(`Validating claim for policy ${taskData.policyId}`);

    try {
      // Retrieve claim data from blockchain
      const claimData = await this.getClaimData(taskData.policyId);

      // Validate claim eligibility
      const eligibilityCheck = await this.checkClaimEligibility(claimData);
      if (!eligibilityCheck.valid) {
        return {
          isValid: false,
          confidence: 1.0,
          reason: eligibilityCheck.reason,
        };
      }

      // Verify IL calculation
      const ilVerification = await this.verifyILCalculation(claimData);
      if (!ilVerification.valid) {
        return {
          isValid: false,
          confidence: 0.9,
          reason: "Invalid IL calculation",
          evidence: ilVerification.evidence,
        };
      }

      // Check vault solvency
      const solvencyCheck = await this.checkVaultSolvency(claimData.requestedAmount);
      if (!solvencyCheck) {
        return {
          isValid: false,
          confidence: 1.0,
          reason: "Vault not solvent for requested amount",
        };
      }

      // All checks passed
      return {
        isValid: true,
        confidence: 0.95,
        evidence: {
          eligibilityCheck,
          ilVerification,
          solvencyCheck,
        },
      };
    } catch (error) {
      this.logger.error("Claim validation failed:", error);
      return {
        isValid: false,
        confidence: 0.0,
        reason: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Submit attestation for a claim
   */
  async submitAttestation(taskIndex: number, isValid: boolean, evidence?: any): Promise<Hash> {
    try {
      const taskData = this.activeTasks.get(taskIndex);
      if (!taskData) {
        throw new Error(`No active task found for index ${taskIndex}`);
      }

      // Create attestation message
      const attestationMessage = this.createAttestationMessage(taskData.policyId, isValid, evidence);

      // Sign attestation
      const signature = await this.signAttestation(attestationMessage);

      // Submit to consensus manager
      const txHash = await this.consensusManager.submitAttestation(taskIndex, isValid, signature);

      this.logger.info(`Attestation submitted for task ${taskIndex}: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error("Failed to submit attestation:", error);
      throw error;
    }
  }

  /**
   * Handle slashing event
   */
  async handleSlashing(reason: string, evidence: any): Promise<void> {
    try {
      this.logger.warn(`Slashing detected: ${reason}`);

      // Report to slashing service
      await this.slashingService.reportSlashing(this.config.operatorAddress, reason, evidence);

      // Emit slashing event
      this.emit("slashed", { reason, evidence });
    } catch (error) {
      this.logger.error("Failed to handle slashing:", error);
    }
  }

  /**
   * Start monitoring blockchain events
   */
  private async startEventMonitoring(): Promise<void> {
    // Monitor new task creation
    this.registry.on("newTask", async (taskData: TaskData) => {
      this.logger.info(`New task received: ${taskData.taskIndex}`);

      this.activeTasks.set(taskData.taskIndex, taskData);

      // Validate claim
      const validationResult = await this.validateClaim(taskData);

      // Submit attestation
      await this.submitAttestation(taskData.taskIndex, validationResult.isValid, validationResult.evidence);
    });

    // Monitor task completion
    this.registry.on("taskCompleted", (taskIndex: number) => {
      this.activeTasks.delete(taskIndex);
      this.logger.info(`Task ${taskIndex} completed`);
    });

    // Monitor slashing events
    this.registry.on("operatorSlashed", async (data: any) => {
      if (data.operator === this.config.operatorAddress) {
        await this.handleSlashing(data.reason, data.evidence);
      }
    });
  }

  /**
   * Stop event monitoring
   */
  private async stopEventMonitoring(): Promise<void> {
    this.registry.removeAllListeners();
  }

  /**
   * Get claim data from blockchain
   */
  private async getClaimData(policyId: bigint): Promise<any> {
    // Implementation to fetch claim data from PolicyManager contract
    // This would use the contract ABI to call getClaimDetails
    return {};
  }

  /**
   * Check claim eligibility
   */
  private async checkClaimEligibility(claimData: any): Promise<{ valid: boolean; reason?: string }> {
    // Check if policy is active
    if (!claimData.policy.active) {
      return { valid: false, reason: "Policy not active" };
    }

    // Check if policy hasn't expired
    const currentTime = Date.now();
    const expiryTime = claimData.policy.createdAt + claimData.policy.params.duration * 12 * 1000;

    if (currentTime > expiryTime) {
      return { valid: false, reason: "Policy expired" };
    }

    // Check if no existing successful claim
    if (claimData.status === 3) {
      // Settled
      return { valid: false, reason: "Claim already settled" };
    }

    return { valid: true };
  }

  /**
   * Verify IL calculation
   */
  private async verifyILCalculation(claimData: any): Promise<{ valid: boolean; evidence?: any }> {
    try {
      // This would integrate with the Fhenix service to verify the calculation
      // For now, return a placeholder validation
      return { valid: true, evidence: {} };
    } catch (error) {
      return { valid: false, evidence: { error: error.message } };
    }
  }

  /**
   * Check vault solvency
   */
  private async checkVaultSolvency(requestedAmount: bigint): Promise<boolean> {
    // Implementation to check vault solvency
    return true;
  }

  /**
   * Create attestation message
   */
  private createAttestationMessage(policyId: bigint, isValid: boolean, evidence?: any): string {
    return JSON.stringify({
      policyId: policyId.toString(),
      isValid,
      evidence,
      operator: this.config.operatorAddress,
      timestamp: Date.now(),
    });
  }

  /**
   * Sign attestation message
   */
  private async signAttestation(message: string): Promise<string> {
    // Implementation to sign message with operator's private key
    return "0x..."; // Placeholder
  }

  /**
   * Get operator status
   */
  getStatus(): {
    isRunning: boolean;
    activeTasks: number;
    operatorAddress: Address;
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      operatorAddress: this.config.operatorAddress,
    };
  }
}
```

#### 2. Settlement Service

**File**: `src/services/SettlementService.ts`

```typescript
import { Address, Hash } from "viem";
import { Logger } from "../utils/Logger";

interface SettlementRequest {
  policyId: bigint;
  claimAmount: bigint;
  attestations: Attestation[];
  evidence: any;
}

interface Attestation {
  operator: Address;
  isValid: boolean;
  signature: string;
  timestamp: number;
}

interface SettlementResult {
  approved: boolean;
  finalAmount: bigint;
  participants: Address[];
  consensusReached: boolean;
}

export class SettlementService {
  private logger: Logger;
  private settlements = new Map<string, SettlementResult>();

  constructor(config: any) {
    this.logger = new Logger("SettlementService");
  }

  /**
   * Process settlement for a claim
   */
  async processSettlement(request: SettlementRequest): Promise<SettlementResult> {
    this.logger.info(`Processing settlement for policy ${request.policyId}`);

    try {
      // Validate attestations
      const validAttestations = await this.validateAttestations(request.attestations);

      // Check consensus threshold
      const consensusReached = this.checkConsensusThreshold(validAttestations);

      if (!consensusReached) {
        return {
          approved: false,
          finalAmount: 0n,
          participants: [],
          consensusReached: false,
        };
      }

      // Calculate final settlement amount
      const finalAmount = await this.calculateFinalAmount(request.claimAmount, validAttestations, request.evidence);

      // Create settlement result
      const result: SettlementResult = {
        approved: true,
        finalAmount,
        participants: validAttestations.map(a => a.operator),
        consensusReached: true,
      };

      // Store settlement
      this.settlements.set(request.policyId.toString(), result);

      this.logger.info(`Settlement approved for policy ${request.policyId}: ${finalAmount}`);
      return result;
    } catch (error) {
      this.logger.error("Settlement processing failed:", error);
      throw error;
    }
  }

  /**
   * Validate operator attestations
   */
  private async validateAttestations(attestations: Attestation[]): Promise<Attestation[]> {
    const validAttestations: Attestation[] = [];

    for (const attestation of attestations) {
      try {
        // Verify signature
        const isValidSignature = await this.verifyAttestationSignature(attestation);

        // Check operator is registered and active
        const isValidOperator = await this.verifyOperator(attestation.operator);

        if (isValidSignature && isValidOperator) {
          validAttestations.push(attestation);
        }
      } catch (error) {
        this.logger.warn(`Invalid attestation from ${attestation.operator}: ${error.message}`);
      }
    }

    return validAttestations;
  }

  /**
   * Check if consensus threshold is reached
   */
  private checkConsensusThreshold(attestations: Attestation[]): boolean {
    const totalAttestations = attestations.length;
    const validAttestations = attestations.filter(a => a.isValid).length;

    // Require 2/3 majority for consensus
    const threshold = Math.ceil((totalAttestations * 2) / 3);

    return validAttestations >= threshold;
  }

  /**
   * Calculate final settlement amount
   */
  private async calculateFinalAmount(
    requestedAmount: bigint,
    attestations: Attestation[],
    evidence: any
  ): Promise<bigint> {
    // Apply consensus-based adjustments
    const consensusRatio = attestations.filter(a => a.isValid).length / attestations.length;

    // Reduce amount based on confidence level
    const adjustmentFactor = BigInt(Math.floor(consensusRatio * 100));
    const adjustedAmount = (requestedAmount * adjustmentFactor) / 100n;

    return adjustedAmount;
  }

  /**
   * Verify attestation signature
   */
  private async verifyAttestationSignature(attestation: Attestation): Promise<boolean> {
    // Implementation to verify cryptographic signature
    return true; // Placeholder
  }

  /**
   * Verify operator registration and status
   */
  private async verifyOperator(operator: Address): Promise<boolean> {
    // Implementation to check operator status with AVS registry
    return true; // Placeholder
  }

  /**
   * Get settlement result
   */
  getSettlement(policyId: string): SettlementResult | undefined {
    return this.settlements.get(policyId);
  }
}
```

#### 3. Consensus Manager

**File**: `src/aggregation/ConsensusManager.ts`

```typescript
import { EventEmitter } from "events";
import { Address, Hash } from "viem";
import { Logger } from "../utils/Logger";

interface ConsensusTask {
  taskIndex: number;
  policyId: bigint;
  requiredQuorum: number;
  attestations: Map<Address, boolean>;
  signatures: Map<Address, string>;
  deadline: number;
  status: "pending" | "completed" | "failed";
}

export class ConsensusManager extends EventEmitter {
  private logger: Logger;
  private activeTasks = new Map<number, ConsensusTask>();
  private operators = new Set<Address>();
  private isRunning = false;

  constructor(config: any) {
    super();
    this.logger = new Logger("ConsensusManager");
  }

  /**
   * Start consensus manager
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info("Consensus Manager started");

    // Start periodic cleanup of expired tasks
    this.startTaskCleanup();
  }

  /**
   * Stop consensus manager
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info("Consensus Manager stopped");
  }

  /**
   * Create new consensus task
   */
  createTask(taskIndex: number, policyId: bigint, requiredQuorum: number, deadline: number): void {
    const task: ConsensusTask = {
      taskIndex,
      policyId,
      requiredQuorum,
      attestations: new Map(),
      signatures: new Map(),
      deadline,
      status: "pending",
    };

    this.activeTasks.set(taskIndex, task);
    this.logger.info(`Created consensus task ${taskIndex} for policy ${policyId}`);
  }

  /**
   * Submit attestation for a task
   */
  async submitAttestation(taskIndex: number, isValid: boolean, signature: string): Promise<Hash> {
    const task = this.activeTasks.get(taskIndex);
    if (!task) {
      throw new Error(`Task ${taskIndex} not found`);
    }

    if (task.status !== "pending") {
      throw new Error(`Task ${taskIndex} is not pending`);
    }

    if (Date.now() > task.deadline) {
      throw new Error(`Task ${taskIndex} deadline exceeded`);
    }

    // Record attestation
    // Note: In real implementation, operator address would be extracted from signature
    const operatorAddress = "0x..." as Address; // Placeholder

    task.attestations.set(operatorAddress, isValid);
    task.signatures.set(operatorAddress, signature);

    this.logger.info(`Attestation submitted for task ${taskIndex} by ${operatorAddress}: ${isValid}`);

    // Check if consensus is reached
    await this.checkConsensus(task);

    return "0x..." as Hash; // Placeholder transaction hash
  }

  /**
   * Check if consensus is reached for a task
   */
  private async checkConsensus(task: ConsensusTask): Promise<void> {
    const totalAttestations = task.attestations.size;
    const validAttestations = Array.from(task.attestations.values()).filter(Boolean).length;

    // Check if quorum is reached
    if (totalAttestations >= task.requiredQuorum) {
      const consensusReached = validAttestations >= Math.ceil((task.requiredQuorum * 2) / 3);

      if (consensusReached) {
        task.status = "completed";
        this.logger.info(`Consensus reached for task ${task.taskIndex}`);

        // Emit consensus event
        this.emit("consensus", {
          taskIndex: task.taskIndex,
          policyId: task.policyId,
          approved: validAttestations > totalAttestations / 2,
          attestations: Array.from(task.attestations.entries()),
          signatures: Array.from(task.signatures.entries()),
        });
      } else if (totalAttestations >= this.operators.size * 0.8) {
        // If most operators have responded but consensus not reached, fail task
        task.status = "failed";
        this.logger.warn(`Consensus failed for task ${task.taskIndex}`);

        this.emit("consensus-failed", {
          taskIndex: task.taskIndex,
          policyId: task.policyId,
        });
      }
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskIndex: number): ConsensusTask | undefined {
    return this.activeTasks.get(taskIndex);
  }

  /**
   * Add operator to consensus pool
   */
  addOperator(operator: Address): void {
    this.operators.add(operator);
    this.logger.info(`Operator ${operator} added to consensus pool`);
  }

  /**
   * Remove operator from consensus pool
   */
  removeOperator(operator: Address): void {
    this.operators.delete(operator);
    this.logger.info(`Operator ${operator} removed from consensus pool`);
  }

  /**
   * Start periodic cleanup of expired tasks
   */
  private startTaskCleanup(): void {
    setInterval(() => {
      if (!this.isRunning) return;

      const now = Date.now();
      const expiredTasks: number[] = [];

      for (const [taskIndex, task] of this.activeTasks) {
        if (now > task.deadline && task.status === "pending") {
          task.status = "failed";
          expiredTasks.push(taskIndex);

          this.emit("task-expired", {
            taskIndex,
            policyId: task.policyId,
          });
        }
      }

      // Clean up expired tasks
      expiredTasks.forEach(taskIndex => {
        this.activeTasks.delete(taskIndex);
        this.logger.info(`Cleaned up expired task ${taskIndex}`);
      });
    }, 60000); // Check every minute
  }

  /**
   * Get consensus statistics
   */
  getStats(): {
    activeTasks: number;
    totalOperators: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const completed = Array.from(this.activeTasks.values()).filter(t => t.status === "completed").length;
    const failed = Array.from(this.activeTasks.values()).filter(t => t.status === "failed").length;

    return {
      activeTasks: this.activeTasks.size,
      totalOperators: this.operators.size,
      completedTasks: completed,
      failedTasks: failed,
    };
  }
}
```

### Testing

#### Unit Tests

**File**: `test/AVSNode.test.ts`

```typescript
import { AVSNode } from "../src/AVSNode";
import { OperatorConfig } from "../src/interfaces";

describe("AVSNode", () => {
  let avsNode: AVSNode;
  let config: OperatorConfig;

  beforeEach(() => {
    config = {
      operatorAddress: "0x1234567890123456789012345678901234567890",
      privateKey: "test-private-key",
      eigenLayerAddress: "0x...",
      avsManagerAddress: "0x...",
      stakingToken: "0x...",
      minStake: BigInt(1000000000000000000), // 1 ETH
    };

    avsNode = new AVSNode(config);
  });

  afterEach(async () => {
    if (avsNode.getStatus().isRunning) {
      await avsNode.stop();
    }
  });

  describe("start", () => {
    it("should start the AVS node successfully", async () => {
      await avsNode.start();
      expect(avsNode.getStatus().isRunning).toBe(true);
    });

    it("should emit started event", async () => {
      const startedPromise = new Promise(resolve => {
        avsNode.once("started", resolve);
      });

      await avsNode.start();
      await startedPromise;
    });
  });

  describe("validateClaim", () => {
    it("should validate a valid claim", async () => {
      const taskData = {
        taskIndex: 1,
        policyId: BigInt(123),
        claimHash: "0x...",
        blockNumber: 1000000,
        quorumThreshold: 67,
      };

      const result = await avsNode.validateClaim(taskData);
      expect(result.isValid).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("stop", () => {
    it("should stop the AVS node", async () => {
      await avsNode.start();
      await avsNode.stop();
      expect(avsNode.getStatus().isRunning).toBe(false);
    });
  });
});
```

---

## 3. Indexer Service

**Location**: `scripts/indexer/`

### Purpose

Monitors blockchain events, aggregates data, and provides API endpoints for historical data queries and analytics.

### Project Structure

```
scripts/indexer/
├── src/
│   ├── index.ts            # Main indexer logic
│   └── cli.ts              # Command-line interface
├── test/
│   └── indexer.test.ts     # Indexer tests
├── package.json            # Dependencies
└── jest.config.js          # Test configuration
```

### Core Implementation

**File**: `src/index.ts`

```typescript
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";

interface PolicyEvent {
  policyId: bigint;
  lp: string;
  pool: string;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

interface ClaimEvent {
  policyId: bigint;
  claimer: string;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

export class BlockchainIndexer {
  private client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.RPC_URL),
  });

  private policyEvents: PolicyEvent[] = [];
  private claimEvents: ClaimEvent[] = [];
  private lastProcessedBlock = 0n;

  async start(fromBlock?: bigint): Promise<void> {
    console.log("Starting blockchain indexer...");

    this.lastProcessedBlock = fromBlock || (await this.client.getBlockNumber()) - 1000n;

    // Start event monitoring
    await this.indexPolicyEvents();
    await this.indexClaimEvents();

    // Start real-time monitoring
    this.startRealTimeMonitoring();
  }

  private async indexPolicyEvents(): Promise<void> {
    const logs = await this.client.getLogs({
      address: process.env.POLICY_MANAGER_ADDRESS as `0x${string}`,
      event: parseAbiItem("event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool)"),
      fromBlock: this.lastProcessedBlock,
      toBlock: "latest",
    });

    for (const log of logs) {
      const event: PolicyEvent = {
        policyId: log.args.policyId!,
        lp: log.args.lp!,
        pool: log.args.pool!,
        blockNumber: log.blockNumber!,
        transactionHash: log.transactionHash!,
        timestamp: Date.now(), // Would get actual block timestamp
      };

      this.policyEvents.push(event);
    }

    console.log(`Indexed ${logs.length} policy events`);
  }

  private async indexClaimEvents(): Promise<void> {
    const logs = await this.client.getLogs({
      address: process.env.POLICY_MANAGER_ADDRESS as `0x${string}`,
      event: parseAbiItem("event ClaimRequested(uint256 indexed policyId, address indexed claimer, uint256 amount)"),
      fromBlock: this.lastProcessedBlock,
      toBlock: "latest",
    });

    for (const log of logs) {
      const event: ClaimEvent = {
        policyId: log.args.policyId!,
        claimer: log.args.claimer!,
        amount: log.args.amount!,
        blockNumber: log.blockNumber!,
        transactionHash: log.transactionHash!,
        timestamp: Date.now(),
      };

      this.claimEvents.push(event);
    }

    console.log(`Indexed ${logs.length} claim events`);
  }

  private startRealTimeMonitoring(): void {
    // Watch for new policy creation events
    this.client.watchEvent({
      address: process.env.POLICY_MANAGER_ADDRESS as `0x${string}`,
      event: parseAbiItem("event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool)"),
      onLogs: logs => {
        for (const log of logs) {
          const event: PolicyEvent = {
            policyId: log.args.policyId!,
            lp: log.args.lp!,
            pool: log.args.pool!,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
            timestamp: Date.now(),
          };

          this.policyEvents.push(event);
          console.log(`New policy created: ${event.policyId}`);
        }
      },
    });

    // Watch for claim events
    this.client.watchEvent({
      address: process.env.POLICY_MANAGER_ADDRESS as `0x${string}`,
      event: parseAbiItem("event ClaimRequested(uint256 indexed policyId, address indexed claimer, uint256 amount)"),
      onLogs: logs => {
        for (const log of logs) {
          const event: ClaimEvent = {
            policyId: log.args.policyId!,
            claimer: log.args.claimer!,
            amount: log.args.amount!,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
            timestamp: Date.now(),
          };

          this.claimEvents.push(event);
          console.log(`New claim requested: ${event.policyId}`);
        }
      },
    });
  }

  // API methods
  getPolicyEvents(filter?: { lp?: string; pool?: string }): PolicyEvent[] {
    if (!filter) return this.policyEvents;

    return this.policyEvents.filter(event => {
      if (filter.lp && event.lp !== filter.lp) return false;
      if (filter.pool && event.pool !== filter.pool) return false;
      return true;
    });
  }

  getClaimEvents(filter?: { claimer?: string; policyId?: bigint }): ClaimEvent[] {
    if (!filter) return this.claimEvents;

    return this.claimEvents.filter(event => {
      if (filter.claimer && event.claimer !== filter.claimer) return false;
      if (filter.policyId && event.policyId !== filter.policyId) return false;
      return true;
    });
  }

  getStats(): {
    totalPolicies: number;
    totalClaims: number;
    lastProcessedBlock: bigint;
  } {
    return {
      totalPolicies: this.policyEvents.length,
      totalClaims: this.claimEvents.length,
      lastProcessedBlock: this.lastProcessedBlock,
    };
  }
}
```

---

## Environment Configuration

### Fhenix Service

```bash
# .env
PORT=3001
NODE_ENV=development
FHENIX_RPC_URL=https://api.helium.fhenix.zone
FHENIX_CHAIN_ID=8008135
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

### AVS Node

```bash
# .env
OPERATOR_ADDRESS=0x...
OPERATOR_PRIVATE_KEY=...
EIGENLAYER_ADDRESS=0x...
AVS_MANAGER_ADDRESS=0x...
STAKING_TOKEN_ADDRESS=0x...
MIN_STAKE=1000000000000000000
RPC_URL=https://sepolia.infura.io/v3/...
```

### Indexer Service

```bash
# .env
RPC_URL=https://sepolia.infura.io/v3/...
POLICY_MANAGER_ADDRESS=0x...
INSURANCE_VAULT_ADDRESS=0x...
START_BLOCK=4000000
```

---

## Deployment

### Docker Compose Setup

```yaml
version: "3.8"

services:
  fhenix-service:
    build: ./fhenix-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - FHENIX_RPC_URL=${FHENIX_RPC_URL}
    networks:
      - backend

  avs-node:
    build: ./avs-node
    environment:
      - OPERATOR_PRIVATE_KEY=${OPERATOR_PRIVATE_KEY}
      - RPC_URL=${RPC_URL}
    networks:
      - backend

  indexer:
    build: ./scripts/indexer
    environment:
      - RPC_URL=${RPC_URL}
      - POLICY_MANAGER_ADDRESS=${POLICY_MANAGER_ADDRESS}
    networks:
      - backend

networks:
  backend:
    driver: bridge
```

---

This completes the comprehensive backend services documentation, covering all three main services: Fhenix Service for confidential computations, AVS Node for decentralized verification, and Indexer Service for data aggregation.

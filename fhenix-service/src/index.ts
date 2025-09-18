import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { ComputeClaimRequestSchema, ComputeClaimResponse, ErrorResponse } from "./types";
import { ILCalculationService } from "./ilCalculation";
import { SignatureService } from "./signature";

// Load environment variables
dotenv.config();

// Create app function for testing
export function createApp() {
  const app = express();
  const WORKER_ID = process.env.FHENIX_WORKER_ID || "worker-1";

  // Initialize services
  const ilService = new ILCalculationService();
  const signatureService = new SignatureService(
    process.env.FHENIX_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey
  );

  // Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(morgan("combined"));
  app.use(express.json({ limit: "10mb" }));

  // Error handler for async routes
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Health check endpoint
  app.get("/api/status", (req: express.Request, res: express.Response) => {
    res.json({
      status: "healthy",
      service: "fhenix-real-fhe",
      timestamp: new Date().toISOString(),
      workerId: WORKER_ID,
      version: "1.0.0",
      fheEnabled: true,
    });
  });

  // Worker info endpoint
  app.get("/api/worker-info", (req: express.Request, res: express.Response) => {
    res.json({
      workerId: WORKER_ID,
      publicKey: `0x04${"1".repeat(128)}`, // Mock public key (in production, would be real FHE public key)
      signerAddress: signatureService.getSignerAddress(),
      capabilities: ["impermanent-loss-calculation", "confidential-computation", "attestation-generation", "real-fhe"],
      status: "active",
      version: "1.0.0",
      fheEnabled: true,
    });
  });

  // Main compute claim endpoint
  app.post(
    "/api/compute-claim",
    asyncHandler(async (req: express.Request, res: express.Response) => {
      try {
        // Validate request
        const validationResult = ComputeClaimRequestSchema.safeParse(req.body);

        if (!validationResult.success) {
          const errorResponse: ErrorResponse = {
            error: "Validation Error",
            message: `Invalid request format: ${validationResult.error.issues.map((i: any) => i.message).join(", ")}`,
            timestamp: new Date().toISOString(),
          };
          return res.status(400).json(errorResponse);
        }

        const { policyId, entryCommit, exitCommit, publicRefs } = validationResult.data;

        console.log(`🔄 Processing claim for policy ${policyId}`);
        console.log(`📊 Entry commit: ${entryCommit}`);
        console.log(`📊 Exit commit: ${exitCommit}`);
        console.log(`🏊 Pool: ${publicRefs.pool}`);

        // Calculate IL using real FHE computation
        const { payout, auditHash } = await ilService.calculateIL(
          entryCommit,
          exitCommit,
          publicRefs.twapRoot,
          publicRefs.pool
        );

        console.log(`💰 Calculated payout: ${payout}`);
        console.log(`🔍 Audit hash: ${auditHash}`);

        // Sign the attestation
        const fhenixSignature = await signatureService.signAttestation(policyId, payout, auditHash, WORKER_ID);

        console.log(`✍️ Signature: ${fhenixSignature}`);
        console.log(`🏷️ Signer address: ${signatureService.getSignerAddress()}`);

        // Prepare response
        const response: ComputeClaimResponse = {
          policyId,
          payout,
          auditHash,
          fhenixSignature,
          workerId: WORKER_ID,
        };

        console.log(`✅ Claim processed successfully for policy ${policyId}`);
        res.json(response);
      } catch (error) {
        console.error("❌ Error processing claim:", error);

        const errorResponse: ErrorResponse = {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          timestamp: new Date().toISOString(),
        };

        res.status(500).json(errorResponse);
      }
    })
  );

  // Global error handler
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler:", error);

    const errorResponse: ErrorResponse = {
      error: "Server Error",
      message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(errorResponse);
  });

  // 404 handler
  app.use("*", (req: express.Request, res: express.Response) => {
    const errorResponse: ErrorResponse = {
      error: "Not Found",
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
    };

    res.status(404).json(errorResponse);
  });

  return app;
}

// Start server if this is the main module
if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3001;

  const server = app.listen(PORT, () => {
    console.log(`🚀 Fhenix Service running on port ${PORT}`);
    console.log(`🔐 Worker ID: ${process.env.FHENIX_WORKER_ID || "worker-1"}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/status`);
    console.log(`🔧 Worker info: http://localhost:${PORT}/api/worker-info`);
    console.log(`🧮 Compute endpoint: http://localhost:${PORT}/api/compute-claim`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(() => {
      console.log("Process terminated");
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully");
    server.close(() => {
      console.log("Process terminated");
    });
  });
}

export default createApp;

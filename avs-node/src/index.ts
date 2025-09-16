import { AVSNode } from "./AVSNode";
import { AVSNodeConfig } from "./interfaces";
import { Logger } from "./utils/Logger";

/**
 * Main entry point for AVS Node
 */

// Default configuration
const defaultConfig: AVSNodeConfig = {
  operator: {
    privateKey: process.env.OPERATOR_PRIVATE_KEY || "",
    address: process.env.OPERATOR_ADDRESS || "",
    rpcUrl: process.env.RPC_URL || "http://localhost:8545",
    avsManagerAddress: process.env.AVS_MANAGER_ADDRESS || "",
    stake: BigInt(process.env.MINIMUM_STAKE || "1000000000000000000"), // 1 ETH
  },
  network: {
    chainId: parseInt(process.env.CHAIN_ID || "31337"),
    rpcUrl: process.env.RPC_URL || "http://localhost:8545",
    wsUrl: process.env.WS_URL,
  },
  avs: {
    managerAddress: process.env.AVS_MANAGER_ADDRESS || "",
    minimumStake: BigInt(process.env.MINIMUM_STAKE || "1000000000000000000"),
    signatureThreshold: parseInt(process.env.SIGNATURE_THRESHOLD || "1"),
  },
  consensus: {
    operatorCount: parseInt(process.env.OPERATOR_COUNT || "3"),
    threshold: parseInt(process.env.CONSENSUS_THRESHOLD || "2"),
    timeoutMs: parseInt(process.env.CONSENSUS_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
  },
  p2p: {
    port: parseInt(process.env.P2P_PORT || "9000"),
    peers: process.env.P2P_PEERS?.split(",") || [],
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || "50"),
  },
  api: {
    enabled: process.env.API_ENABLED !== "false",
    port: parseInt(process.env.API_PORT || "3000"),
    cors: process.env.CORS_ENABLED !== "false",
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || "info",
    file: process.env.LOG_FILE,
  },
};

/**
 * Initialize and start AVS Node
 */
async function main(): Promise<void> {
  const logger = new Logger(defaultConfig.logging);

  try {
    logger.info("Starting Confidential IL Insurance AVS Node...");

    // Validate required environment variables
    if (!defaultConfig.operator.privateKey) {
      throw new Error("OPERATOR_PRIVATE_KEY environment variable is required");
    }

    if (!defaultConfig.avs.managerAddress) {
      throw new Error("AVS_MANAGER_ADDRESS environment variable is required");
    }

    // Create and start AVS Node
    const avsNode = new AVSNode(defaultConfig);

    // Set up event listeners
    setupEventHandlers(avsNode, logger);

    // Start the node
    await avsNode.start();

    logger.info("AVS Node started successfully", {
      operator: defaultConfig.operator.address,
      network: defaultConfig.network.chainId,
      avsManager: defaultConfig.avs.managerAddress,
    });

    // Keep the process running
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await avsNode.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await avsNode.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start AVS Node", error);
    process.exit(1);
  }
}

/**
 * Set up event handlers for AVS Node
 */
function setupEventHandlers(avsNode: AVSNode, logger: Logger): void {
  // Attestation events
  avsNode.on("attestation-request", request => {
    logger.info("Received attestation request", {
      policyId: request.policyId.toString(),
      payout: request.payout.toString(),
      requestId: request.requestId,
    });
  });

  avsNode.on("attestation-response", response => {
    logger.info("Submitted attestation response", {
      policyId: response.policyId.toString(),
      approved: response.approved,
      operator: response.operatorAddress,
      requestId: response.requestId,
    });
  });

  avsNode.on("consensus-reached", result => {
    logger.info("Consensus reached", {
      policyId: result.policyId.toString(),
      approved: result.approved,
      operators: result.participatingOperators.length,
      threshold: result.threshold,
    });
  });

  // Operator events
  avsNode.on("operator-registered", (address, stake) => {
    logger.info("Operator registered", {
      address,
      stake: stake.toString(),
    });
  });

  avsNode.on("operator-slashed", (address, amount, reason) => {
    logger.warn("Operator slashed", {
      address,
      amount: amount.toString(),
      reason,
    });
  });

  // Settlement events
  avsNode.on("settlement-processed", (policyId, amount) => {
    logger.info("Settlement processed", {
      policyId: policyId.toString(),
      amount: amount.toString(),
    });
  });

  // Error events
  avsNode.on("error", error => {
    logger.error("AVS Node error", error);
  });

  // Node lifecycle events
  avsNode.on("node-started", () => {
    logger.info("AVS Node lifecycle: started");
  });

  avsNode.on("node-stopped", () => {
    logger.info("AVS Node lifecycle: stopped");
  });
}

/**
 * Health check endpoint
 */
async function healthCheck(avsNode: AVSNode): Promise<any> {
  try {
    const health = await avsNode.getHealth();
    const operatorStatus = await avsNode.getOperatorStatus();

    return {
      status: health.isHealthy ? "healthy" : "unhealthy",
      uptime: health.uptime,
      lastActivity: health.lastActivity,
      errors: health.errors.slice(-10), // Last 10 errors
      operator: {
        isActive: operatorStatus.isActive,
        stake: operatorStatus.stake.toString(),
        slashingHistory: operatorStatus.slashingHistory,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { AVSNode, defaultConfig, healthCheck };
export * from "./interfaces";
export * from "./AVSRegistry";

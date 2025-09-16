import { AVSNode } from "../AVSNode";
import { AVSNodeConfig } from "../interfaces";
import { Logger } from "../utils/Logger";

describe("AVSNode", () => {
  let mockConfig: AVSNodeConfig;

  beforeEach(() => {
    mockConfig = {
      operator: {
        privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        address: "0x1234567890123456789012345678901234567890",
        rpcUrl: "http://localhost:8545",
        avsManagerAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
        stake: BigInt("1000000000000000000"),
      },
      network: {
        chainId: 31337,
        rpcUrl: "http://localhost:8545",
      },
      avs: {
        managerAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
        minimumStake: BigInt("1000000000000000000"),
        signatureThreshold: 1,
      },
      consensus: {
        operatorCount: 3,
        threshold: 2,
        timeoutMs: 30000,
        maxRetries: 3,
      },
      p2p: {
        port: 9000,
        peers: [],
        maxConnections: 50,
      },
      api: {
        enabled: true,
        port: 3000,
        cors: true,
      },
      logging: {
        level: "info",
      },
    };
  });

  it("should create an AVSNode instance", () => {
    const avsNode = new AVSNode(mockConfig);
    expect(avsNode).toBeInstanceOf(AVSNode);
    expect(avsNode.isRunning()).toBe(false);
  });

  it("should handle basic configuration", () => {
    const avsNode = new AVSNode(mockConfig);
    expect(avsNode.isRunning()).toBe(false);
  });

  it("should get health status when not running", async () => {
    const avsNode = new AVSNode(mockConfig);
    const health = await avsNode.getHealth();

    expect(health).toHaveProperty("isHealthy");
    expect(health).toHaveProperty("uptime");
    expect(health).toHaveProperty("lastActivity");
    expect(health).toHaveProperty("errors");
    expect(Array.isArray(health.errors)).toBe(true);
  });
});

describe("Logger", () => {
  it("should create a logger instance", () => {
    const logger = new Logger({ level: "info" });
    expect(logger).toBeInstanceOf(Logger);
  });

  it("should log messages without throwing", () => {
    const logger = new Logger({ level: "debug" });

    // These should not throw
    expect(() => {
      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");
    }).not.toThrow();
  });
});

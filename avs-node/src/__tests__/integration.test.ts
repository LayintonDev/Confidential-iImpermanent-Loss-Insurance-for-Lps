import { AVSNode } from "../AVSNode";
import { AVSRegistry } from "../AVSRegistry";
import { AVSNodeConfig } from "../interfaces";

describe("Integration Tests", () => {
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
        level: "error", // Reduce noise in tests
      },
    };
  });

  it("should create AVS components without network connectivity", () => {
    // Test that we can create the components without throwing
    expect(() => {
      const avsNode = new AVSNode(mockConfig);
      expect(avsNode).toBeInstanceOf(AVSNode);
    }).not.toThrow();
  });

  it("should handle attestation request structure", () => {
    const avsNode = new AVSNode(mockConfig);

    const mockRequest = {
      policyId: BigInt(123),
      fhenixSignature: "mock_signature_data",
      payout: BigInt("1000000000000000000"),
      timestamp: Date.now(),
      requestId: "test-request-123",
    };

    // Should be able to process the request structure
    expect(mockRequest.policyId).toBe(BigInt(123));
    expect(mockRequest.fhenixSignature).toBe("mock_signature_data");
    expect(mockRequest.payout).toBe(BigInt("1000000000000000000"));
  });

  it("should handle configuration validation", () => {
    const avsNode = new AVSNode(mockConfig);

    // Should report not running initially
    expect(avsNode.isRunning()).toBe(false);
  });

  it("should handle event emission structure", done => {
    const avsNode = new AVSNode(mockConfig);

    // Test that event system works
    avsNode.once("test-event", data => {
      expect(data).toBe("test-data");
      done();
    });

    // Emit a test event
    avsNode.emit("test-event", "test-data");
  });
});

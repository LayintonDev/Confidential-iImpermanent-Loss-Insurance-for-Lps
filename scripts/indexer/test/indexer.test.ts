import { describe, it, expect, beforeEach } from "@jest/globals";
import EventIndexer from "../src/index";
import { ethers } from "ethers";

// Mock dependencies
jest.mock("ethers");
jest.mock("axios");

const mockProvider = {
  getNetwork: jest.fn().mockResolvedValue({ name: "localhost", chainId: 31337 }),
  getBlockNumber: jest.fn().mockResolvedValue(1000),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockContract = {
  target: "0x1234567890123456789012345678901234567890",
  on: jest.fn(),
  queryFilter: jest.fn().mockResolvedValue([]),
  filters: {
    PolicyCreated: jest.fn().mockReturnValue({}),
    ClaimRequested: jest.fn().mockReturnValue({}),
  },
  commitmentHashes: jest.fn().mockResolvedValue("0x" + "0".repeat(64)),
};

describe("EventIndexer", () => {
  let indexer: EventIndexer;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock ethers
    (ethers.JsonRpcProvider as jest.Mock).mockImplementation(() => mockProvider);
    (ethers.Contract as jest.Mock).mockImplementation(() => mockContract);
    (ethers.ZeroAddress as any) = "0x0000000000000000000000000000000000000000";

    // Set environment variables
    process.env.RPC_URL = "http://localhost:8545";
    process.env.HOOK_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.POLICY_MANAGER_ADDRESS = "0x0987654321098765432109876543210987654321";
    process.env.FHENIX_SERVICE_URL = "http://localhost:3001";

    indexer = new EventIndexer();
  });

  describe("Constructor", () => {
    it("should initialize with default values", () => {
      expect(indexer).toBeInstanceOf(EventIndexer);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith("http://localhost:8545");
    });

    it("should use environment variables for configuration", () => {
      process.env.MAX_RETRIES = "5";
      process.env.RETRY_DELAY = "10000";

      const customIndexer = new EventIndexer();
      expect(customIndexer).toBeInstanceOf(EventIndexer);
    });
  });

  describe("start()", () => {
    it("should start successfully", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await indexer.start();

      expect(mockProvider.getNetwork).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("🚀 Starting Event Indexer...");
      expect(consoleSpy).toHaveBeenCalledWith("✅ Event Indexer started successfully");

      consoleSpy.mockRestore();
    });

    it("should handle network connection errors", async () => {
      mockProvider.getNetwork.mockRejectedValueOnce(new Error("Network error"));

      await expect(indexer.start()).rejects.toThrow("Network error");
    });
  });

  describe("Event Listening", () => {
    beforeEach(async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      await indexer.start();
      consoleSpy.mockRestore();
    });

    it("should set up PolicyCreated event listener", () => {
      expect(mockContract.on).toHaveBeenCalledWith("PolicyCreated", expect.any(Function));
    });

    it("should set up ClaimRequested event listener", () => {
      expect(mockContract.on).toHaveBeenCalledWith("ClaimRequested", expect.any(Function));
    });

    it("should process PolicyCreated events", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Get the callback function that was registered
      const policyCreatedCallback = mockContract.on.mock.calls.find(call => call[0] === "PolicyCreated")[1];

      // Mock event data
      const mockEvent = {
        blockNumber: 100,
        transactionIndex: 0,
        logIndex: 0,
      };

      // Call the callback
      await policyCreatedCallback(
        1, // policyId
        "0x1111111111111111111111111111111111111111", // lp
        "0x2222222222222222222222222222222222222222", // pool
        12345, // epoch
        mockEvent
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("📋 PolicyCreated: 1"));

      consoleSpy.mockRestore();
    });

    it("should process ClaimRequested events", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Get the callback function that was registered
      const claimRequestedCallback = mockContract.on.mock.calls.find(call => call[0] === "ClaimRequested")[1];

      // Mock event data
      const mockEvent = {
        blockNumber: 100,
        transactionIndex: 0,
        logIndex: 0,
      };

      // Call the callback
      await claimRequestedCallback(
        1, // policyId
        "0x" + "1".repeat(64), // commitmentC
        mockEvent
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("🎯 ClaimRequested: 1"));

      consoleSpy.mockRestore();
    });
  });

  describe("Status Methods", () => {
    beforeEach(async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      await indexer.start();
      consoleSpy.mockRestore();
    });

    it("should return processed events count", () => {
      const count = indexer.getProcessedEventsCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should return policies count", () => {
      const count = indexer.getPoliciesCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should return claim requests count", () => {
      const count = indexer.getClaimRequestsCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in event processing", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      await indexer.start();

      // Get the callback and simulate an error
      const policyCreatedCallback = mockContract.on.mock.calls.find(call => call[0] === "PolicyCreated")[1];

      // Create a mock event that will cause an error
      const mockEvent = {
        blockNumber: 100,
        transactionIndex: 0,
        logIndex: 0,
      };

      // Temporarily break something to cause an error
      const originalCommitmentHashes = mockContract.commitmentHashes;
      mockContract.commitmentHashes = jest.fn().mockRejectedValue(new Error("Contract error"));

      // This should not throw, but should log an error
      await policyCreatedCallback(1, "0x1111", "0x2222", 12345, mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("❌ Error processing PolicyCreated event:"),
        expect.any(Error)
      );

      // Restore
      mockContract.commitmentHashes = originalCommitmentHashes;
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe("Catch up functionality", () => {
    it("should catch up on past events", async () => {
      // Mock past events
      const mockPolicyEvents = [
        {
          args: [BigInt(1), "0x1111", "0x2222", BigInt(12345)],
        },
      ];

      const mockClaimEvents = [
        {
          args: [BigInt(1), "0x" + "1".repeat(64)],
        },
      ];

      mockContract.queryFilter.mockResolvedValueOnce(mockPolicyEvents).mockResolvedValueOnce(mockClaimEvents);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await indexer.start();

      expect(mockContract.queryFilter).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("✅ Caught up: 1 policies, 1 claims"));

      consoleSpy.mockRestore();
    });
  });
});

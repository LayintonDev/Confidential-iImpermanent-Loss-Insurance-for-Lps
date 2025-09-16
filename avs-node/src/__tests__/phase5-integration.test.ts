import { ECDSASignatureAggregator } from "../aggregation/ECDSASignatureAggregator";
import { ConsensusManager } from "../aggregation/ConsensusManager";
import { SettlementService } from "../services/SettlementService";
import { SlashingService, SlashingReason } from "../services/SlashingService";
import { Logger } from "../utils/Logger";
import { AttestationRequest, ConsensusResult, IAVSManagerContract } from "../interfaces";
import { ethers } from "ethers";

describe("Phase 5 Integration Tests", () => {
  let mockAVSManager: IAVSManagerContract;
  let mockWallet: ethers.Wallet;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ level: "error" }); // Reduce log noise in tests

    // Mock wallet
    mockWallet = {
      address: "0x1234567890123456789012345678901234567890",
      provider: {
        getFeeData: jest.fn().mockResolvedValue({
          gasPrice: BigInt("20000000000"), // 20 gwei
        }),
      },
    } as any;

    // Mock AVS Manager contract
    mockAVSManager = {
      settleClaim: jest.fn().mockResolvedValue({
        hash: "0xsettlement123",
        wait: jest.fn().mockResolvedValue({ status: 1, gasUsed: BigInt("100000") }),
      }),
      rejectClaim: jest.fn().mockResolvedValue({
        hash: "0xreject123",
        wait: jest.fn().mockResolvedValue({ status: 1, gasUsed: BigInt("80000") }),
      }),
      challengeAttestation: jest.fn().mockResolvedValue({
        hash: "0xchallenge123",
        wait: jest.fn().mockResolvedValue({ status: 1 }),
      }),
    } as any;
  });

  describe("Multi-Operator Consensus", () => {
    it("should aggregate signatures from multiple operators", async () => {
      const threshold = 3;
      const aggregator = new ECDSASignatureAggregator(threshold, logger);

      const message = ethers.keccak256(ethers.toUtf8Bytes("test message"));

      // Create mock signatures from different operators
      const signatures = [
        {
          r: "0x1111111111111111111111111111111111111111111111111111111111111111",
          s: "0x2222222222222222222222222222222222222222222222222222222222222222",
          v: 27,
          signer: "0xOperator1",
          message,
        },
        {
          r: "0x3333333333333333333333333333333333333333333333333333333333333333",
          s: "0x4444444444444444444444444444444444444444444444444444444444444444",
          v: 28,
          signer: "0xOperator2",
          message,
        },
        {
          r: "0x5555555555555555555555555555555555555555555555555555555555555555",
          s: "0x6666666666666666666666666666666666666666666666666666666666666666",
          v: 27,
          signer: "0xOperator3",
          message,
        },
      ];

      const aggregated = await aggregator.aggregateSignatures(signatures, message);

      expect(aggregated.signatures).toHaveLength(3);
      expect(aggregated.threshold).toBe(3);
      expect(aggregated.participatingOperators).toHaveLength(3);
      expect(aggregated.aggregatedData).toBeTruthy();
    });

    it("should handle consensus session creation", async () => {
      const consensusManager = new ConsensusManager(2, 30000, logger);

      const attestationRequest: AttestationRequest = {
        policyId: BigInt(1),
        fhenixSignature: "0xfhenixsig123",
        payout: BigInt("1000000000000000000"),
        timestamp: Date.now(),
        requestId: "test-request-1",
      };

      const session = consensusManager.startConsensusSession(attestationRequest);
      expect(session.status).toBe("pending");
      expect(consensusManager.hasSession("test-request-1")).toBe(true);

      consensusManager.cleanup();
    });
  });

  describe("Settlement Service Integration", () => {
    it("should queue settlements", async () => {
      const config = {
        batchSize: 5,
        processingInterval: 10000, // Long interval to prevent auto-processing in test
        retryAttempts: 3,
        retryDelay: 500,
        gasLimit: BigInt("500000"),
        maxGasPrice: BigInt("50000000000"),
      };

      const settlementService = new SettlementService(mockAVSManager, mockWallet, config, logger);

      const consensusResult: ConsensusResult = {
        policyId: BigInt(1),
        approved: true,
        aggregatedSignature: "0xaggregated123",
        participatingOperators: ["0xOp1", "0xOp2", "0xOp3"],
        threshold: 2,
        requestId: "test-request-1",
      };

      await settlementService.queueSettlement(consensusResult);

      const status = settlementService.getSettlementStatus(BigInt(1), "test-request-1");
      expect(status).toBeTruthy();
      expect(status?.consensusResult.policyId).toEqual(BigInt(1));

      settlementService.stop();
    });
  });

  describe("Slashing Service Integration", () => {
    it("should create and manage challenges", async () => {
      const config = {
        challengePeriod: 86400000,
        minimalSlashingAmount: BigInt("1000000000000000000"),
        fraudDetectionThreshold: 0.8,
        maxChallengesPerOperator: 5,
        challengeCooldown: 100, // Short cooldown for testing
      };

      const slashingService = new SlashingService(mockAVSManager, mockWallet, config, logger);

      const evidence = {
        reason: SlashingReason.INVALID_SIGNATURE,
        operatorAddress: "0xMaliciousOperator",
        policyId: BigInt(1),
        requestId: "test-request-1",
        evidence: JSON.stringify({ proof: "invalid signature" }),
        timestamp: Date.now(),
        reporter: "0xReporter",
      };

      const challenge = await slashingService.createChallenge("0xChallenger", "0xMaliciousOperator", evidence);

      expect(challenge).toBeTruthy();
      expect(challenge?.targetOperator).toBe("0xMaliciousOperator");
      expect(mockAVSManager.challengeAttestation).toHaveBeenCalled();

      const retrievedChallenge = slashingService.getChallenge(challenge!.id);
      expect(retrievedChallenge).toBeTruthy();

      slashingService.cleanup();
    });

    it("should respect challenge limits", async () => {
      const config = {
        challengePeriod: 86400000,
        minimalSlashingAmount: BigInt("1000000000000000000"),
        fraudDetectionThreshold: 0.8,
        maxChallengesPerOperator: 1, // Limit to 1 challenge
        challengeCooldown: 100,
      };

      const slashingService = new SlashingService(mockAVSManager, mockWallet, config, logger);

      const evidence1 = {
        reason: SlashingReason.INVALID_SIGNATURE,
        operatorAddress: "0xOperator1",
        policyId: BigInt(1),
        requestId: "test-request-1",
        evidence: JSON.stringify({ proof: "evidence1" }),
        timestamp: Date.now(),
        reporter: "0xReporter",
      };

      const evidence2 = {
        reason: SlashingReason.DOUBLE_SIGNING,
        operatorAddress: "0xOperator1",
        policyId: BigInt(2),
        requestId: "test-request-2",
        evidence: JSON.stringify({ proof: "evidence2" }),
        timestamp: Date.now(),
        reporter: "0xReporter",
      };

      // First challenge should succeed
      const challenge1 = await slashingService.createChallenge("0xChallenger", "0xOperator1", evidence1);
      expect(challenge1).toBeTruthy();

      // Second challenge should fail due to limit
      const challenge2 = await slashingService.createChallenge("0xChallenger", "0xOperator1", evidence2);
      expect(challenge2).toBeNull();

      const stats = slashingService.getStatistics();
      expect(stats.totalChallenges).toBe(1);
      expect(stats.pendingChallenges).toBe(1);

      slashingService.cleanup();
    });
  });

  describe("Service Integration", () => {
    it("should initialize all services correctly", () => {
      const threshold = 2;
      const aggregator = new ECDSASignatureAggregator(threshold, logger);
      const consensusManager = new ConsensusManager(threshold, 30000, logger);

      const settlementConfig = {
        batchSize: 1,
        processingInterval: 10000,
        retryAttempts: 3,
        retryDelay: 200,
        gasLimit: BigInt("500000"),
        maxGasPrice: BigInt("50000000000"),
      };

      const slashingConfig = {
        challengePeriod: 86400000,
        minimalSlashingAmount: BigInt("1000000000000000000"),
        fraudDetectionThreshold: 0.8,
        maxChallengesPerOperator: 5,
        challengeCooldown: 3600000,
      };

      const settlementService = new SettlementService(mockAVSManager, mockWallet, settlementConfig, logger);

      const slashingService = new SlashingService(mockAVSManager, mockWallet, slashingConfig, logger);

      // Verify all services are properly initialized
      expect(aggregator.getThreshold()).toBe(threshold);
      expect(consensusManager.hasSession("non-existent")).toBe(false);
      expect(settlementService.getStatistics().pending).toBe(0);
      expect(slashingService.getStatistics().totalChallenges).toBe(0);

      // Cleanup
      consensusManager.cleanup();
      settlementService.stop();
      slashingService.cleanup();
    });
  });
});

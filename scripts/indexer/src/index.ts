import { ethers } from "ethers";
import { EventLog } from "ethers";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

interface PolicyCreatedEvent {
  policyId: bigint;
  lp: string;
  pool: string;
  epoch: bigint;
}

interface ClaimRequestedEvent {
  policyId: bigint;
  commitmentC: string;
}

interface FhenixRequest {
  policyId: number;
  entryCommit: string;
  exitCommit: string;
  publicRefs: {
    twapRoot: string;
    pool: string;
  };
}

interface FhenixResponse {
  policyId: number;
  payout: string;
  auditHash: string;
  fhenixSignature: string;
  workerId: string;
}

export class EventIndexer {
  private provider: ethers.JsonRpcProvider;
  private hookContract: ethers.Contract;
  private policyContract: ethers.Contract;
  private fhenixServiceUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  // Simple in-memory storage for MVP
  private processedEvents: Set<string> = new Set();
  private claimRequests: Map<number, ClaimRequestedEvent> = new Map();
  private policies: Map<number, PolicyCreatedEvent> = new Map();

  constructor() {
    this.fhenixServiceUrl = process.env.FHENIX_SERVICE_URL || "http://localhost:3001";
    this.maxRetries = parseInt(process.env.MAX_RETRIES || "3");
    this.retryDelay = parseInt(process.env.RETRY_DELAY || "5000");

    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");

    // Initialize contracts (ABIs will be loaded from artifacts)
    this.hookContract = new ethers.Contract(
      process.env.HOOK_CONTRACT_ADDRESS || ethers.ZeroAddress,
      this.getHookABI(),
      this.provider
    );

    this.policyContract = new ethers.Contract(
      process.env.POLICY_MANAGER_ADDRESS || ethers.ZeroAddress,
      this.getPolicyManagerABI(),
      this.provider
    );
  }

  async start(): Promise<void> {
    console.log("🚀 Starting Event Indexer...");
    console.log(`📡 RPC URL: ${process.env.RPC_URL}`);
    console.log(`🔗 Fhenix Service: ${this.fhenixServiceUrl}`);
    console.log(`📝 Hook Contract: ${this.hookContract.target}`);
    console.log(`📋 Policy Manager: ${this.policyContract.target}`);

    try {
      // Test connection
      const network = await this.provider.getNetwork();
      console.log(`🌐 Connected to network: ${network.name} (${network.chainId})`);

      // Set up event listeners
      this.setupEventListeners();

      // Catch up on past events
      await this.catchUpPastEvents();

      console.log("✅ Event Indexer started successfully");
    } catch (error) {
      console.error("❌ Failed to start Event Indexer:", error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    console.log("📡 Setting up event listeners...");

    // Listen for PolicyCreated events
    this.policyContract.on("PolicyCreated", async (policyId, lp, pool, epoch, event) => {
      try {
        const eventId = `PolicyCreated_${event.blockNumber}_${event.transactionIndex}_${event.logIndex}`;

        if (this.processedEvents.has(eventId)) {
          return; // Already processed
        }

        console.log(`📋 PolicyCreated: ${policyId} for LP ${lp} in pool ${pool}`);

        const policyEvent: PolicyCreatedEvent = {
          policyId: BigInt(policyId),
          lp,
          pool,
          epoch: BigInt(epoch),
        };

        this.policies.set(Number(policyId), policyEvent);
        this.processedEvents.add(eventId);

        console.log(`✅ Processed PolicyCreated event for policy ${policyId}`);
      } catch (error) {
        console.error(`❌ Error processing PolicyCreated event:`, error);
      }
    });

    // Listen for ClaimRequested events
    this.hookContract.on("ClaimRequested", async (policyId, commitmentC, event) => {
      try {
        const eventId = `ClaimRequested_${event.blockNumber}_${event.transactionIndex}_${event.logIndex}`;

        if (this.processedEvents.has(eventId)) {
          return; // Already processed
        }

        console.log(`🎯 ClaimRequested: ${policyId} with commitment ${commitmentC}`);

        const claimEvent: ClaimRequestedEvent = {
          policyId: BigInt(policyId),
          commitmentC,
        };

        this.claimRequests.set(Number(policyId), claimEvent);
        this.processedEvents.add(eventId);

        // Process the claim request
        await this.processClaimRequest(Number(policyId), commitmentC);
      } catch (error) {
        console.error(`❌ Error processing ClaimRequested event:`, error);
      }
    });

    console.log("✅ Event listeners set up");
  }

  private async catchUpPastEvents(): Promise<void> {
    console.log("📜 Catching up on past events...");

    try {
      // Get current block
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks

      console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock}`);

      // Get past PolicyCreated events
      const policyFilter = this.policyContract.filters.PolicyCreated();
      const policyEvents = await this.policyContract.queryFilter(policyFilter, fromBlock, currentBlock);

      for (const event of policyEvents) {
        if (event instanceof EventLog) {
          const args = event.args;
          if (args) {
            const policyEvent: PolicyCreatedEvent = {
              policyId: BigInt(args[0]),
              lp: args[1],
              pool: args[2],
              epoch: BigInt(args[3]),
            };
            this.policies.set(Number(args[0]), policyEvent);
          }
        }
      }

      // Get past ClaimRequested events
      const claimFilter = this.hookContract.filters.ClaimRequested();
      const claimEvents = await this.hookContract.queryFilter(claimFilter, fromBlock, currentBlock);

      for (const event of claimEvents) {
        if (event instanceof EventLog) {
          const args = event.args;
          if (args) {
            const claimEvent: ClaimRequestedEvent = {
              policyId: BigInt(args[0]),
              commitmentC: args[1],
            };
            this.claimRequests.set(Number(args[0]), claimEvent);

            // Process past claim requests that may not have been processed
            await this.processClaimRequest(Number(args[0]), args[1]);
          }
        }
      }

      console.log(`✅ Caught up: ${policyEvents.length} policies, ${claimEvents.length} claims`);
    } catch (error) {
      console.error("❌ Error catching up on past events:", error);
    }
  }

  private async processClaimRequest(policyId: number, exitCommit: string): Promise<void> {
    console.log(`🔄 Processing claim request for policy ${policyId}`);

    try {
      // Get policy data
      const policy = this.policies.get(policyId);
      if (!policy) {
        console.error(`❌ Policy ${policyId} not found`);
        return;
      }

      // Get entry commitment from contract
      const entryCommit = await this.hookContract.commitmentHashes(policyId);

      // Prepare request for fhenix service
      const fhenixRequest: FhenixRequest = {
        policyId,
        entryCommit,
        exitCommit,
        publicRefs: {
          twapRoot: "0x" + "0".repeat(64), // Mock TWAP root for MVP
          pool: policy.pool,
        },
      };

      console.log(`📤 Sending to Fhenix service:`, fhenixRequest);

      // Call fhenix service with retry logic
      const fhenixResponse = await this.callFhenixServiceWithRetry(fhenixRequest);

      console.log(`📥 Fhenix response:`, fhenixResponse);

      // TODO: In Phase 5, this will trigger AVS flow
      console.log(`🎉 Claim processed for policy ${policyId}, payout: ${fhenixResponse.payout}`);
    } catch (error) {
      console.error(`❌ Error processing claim request for policy ${policyId}:`, error);
    }
  }

  private async callFhenixServiceWithRetry(request: FhenixRequest): Promise<FhenixResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.maxRetries} calling Fhenix service`);

        const response = await axios.post(`${this.fhenixServiceUrl}/api/compute-claim`, request, {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
          },
        });

        return response.data as FhenixResponse;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);

        if (attempt < this.maxRetries) {
          console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw new Error(`Failed to call Fhenix service after ${this.maxRetries} attempts: ${lastError!.message}`);
  }

  // Mock ABIs for MVP - in production these would be loaded from artifacts
  private getHookABI(): ethers.InterfaceAbi {
    return [
      "event ClaimRequested(uint256 indexed policyId, bytes32 commitmentC)",
      "function commitmentHashes(uint256) view returns (bytes32)",
    ];
  }

  private getPolicyManagerABI(): ethers.InterfaceAbi {
    return ["event PolicyCreated(uint256 indexed policyId, address indexed lp, address indexed pool, uint256 epoch)"];
  }

  // Getters for status
  public getProcessedEventsCount(): number {
    return this.processedEvents.size;
  }

  public getPoliciesCount(): number {
    return this.policies.size;
  }

  public getClaimRequestsCount(): number {
    return this.claimRequests.size;
  }
}

// Main execution
async function main() {
  const indexer = new EventIndexer();

  try {
    await indexer.start();

    // Keep the process alive
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down Event Indexer...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Shutting down Event Indexer...");
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      console.log(
        `📊 Status - Events: ${indexer.getProcessedEventsCount()}, Policies: ${indexer.getPoliciesCount()}, Claims: ${indexer.getClaimRequestsCount()}`
      );
    }, 60000); // Log status every minute
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export default EventIndexer;

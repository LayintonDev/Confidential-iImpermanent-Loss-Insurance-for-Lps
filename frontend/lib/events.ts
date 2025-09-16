import { useEffect, useState, useCallback } from "react";
import { Log } from "viem";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "./contracts";

// Event types
export interface PolicyCreatedEvent {
  policyId: bigint;
  lp: string;
  pool: string;
  epoch: bigint;
  blockNumber: bigint;
  transactionHash: string;
}

export interface ClaimRequestedEvent {
  policyId: bigint;
  commitmentC: string;
  blockNumber: bigint;
  transactionHash: string;
}

export interface ClaimAttestedEvent {
  policyId: bigint;
  attestationHash: string;
  blockNumber: bigint;
  transactionHash: string;
}

export interface ClaimSettledEvent {
  policyId: bigint;
  payout: bigint;
  to: string;
  blockNumber: bigint;
  transactionHash: string;
}

export interface PremiumSkimmedEvent {
  pool: string;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: string;
}

// Event parsing utilities
export function parsePolicyCreatedEvent(log: Log): PolicyCreatedEvent {
  // This would parse the actual log data based on the event ABI
  return {
    policyId: BigInt(log.topics[1] || "0"),
    lp: `0x${log.topics[2]?.slice(26)}` || "0x",
    pool: `0x${log.topics[3]?.slice(26)}` || "0x",
    epoch: BigInt(log.data || "0"),
    blockNumber: log.blockNumber || BigInt(0),
    transactionHash: log.transactionHash || "0x",
  };
}

export function parseClaimRequestedEvent(log: Log): ClaimRequestedEvent {
  return {
    policyId: BigInt(log.topics[1] || "0"),
    commitmentC: log.data || "0x",
    blockNumber: log.blockNumber || BigInt(0),
    transactionHash: log.transactionHash || "0x",
  };
}

export function parseClaimAttestedEvent(log: Log): ClaimAttestedEvent {
  return {
    policyId: BigInt(log.topics[1] || "0"),
    attestationHash: log.data || "0x",
    blockNumber: log.blockNumber || BigInt(0),
    transactionHash: log.transactionHash || "0x",
  };
}

export function parseClaimSettledEvent(log: Log): ClaimSettledEvent {
  // Parse structured data from log
  const [payout] = log.data ? [BigInt(log.data.slice(0, 66))] : [BigInt(0)];

  return {
    policyId: BigInt(log.topics[1] || "0"),
    payout,
    to: `0x${log.topics[3]?.slice(26)}` || "0x",
    blockNumber: log.blockNumber || BigInt(0),
    transactionHash: log.transactionHash || "0x",
  };
}

export function parsePremiumSkimmedEvent(log: Log): PremiumSkimmedEvent {
  return {
    pool: `0x${log.topics[1]?.slice(26)}` || "0x",
    amount: BigInt(log.data || "0"),
    blockNumber: log.blockNumber || BigInt(0),
    transactionHash: log.transactionHash || "0x",
  };
}

// Comprehensive event monitoring hook
export function useEventMonitor() {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<{
    policiesCreated: PolicyCreatedEvent[];
    claimsRequested: ClaimRequestedEvent[];
    claimsAttested: ClaimAttestedEvent[];
    claimsSettled: ClaimSettledEvent[];
    premiumsSkimmed: PremiumSkimmedEvent[];
  }>({
    policiesCreated: [],
    claimsRequested: [],
    claimsAttested: [],
    claimsSettled: [],
    premiumsSkimmed: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch historical events
  const fetchHistoricalEvents = useCallback(
    async (fromBlock?: bigint, toBlock?: bigint) => {
      if (!publicClient) return;

      setIsLoading(true);
      setError(null);

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const startBlock = fromBlock || currentBlock - BigInt(10000); // Last ~10k blocks
        const endBlock = toBlock || currentBlock;

        // Fetch all event types in parallel
        const [policyCreatedLogs, claimRequestedLogs, claimAttestedLogs, claimSettledLogs, premiumSkimmedLogs] =
          await Promise.all([
            // Policy created events from Hook
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
              event: {
                type: "event",
                name: "PolicyCreated",
                inputs: [
                  { indexed: true, name: "policyId", type: "uint256" },
                  { indexed: true, name: "lp", type: "address" },
                  { indexed: true, name: "pool", type: "address" },
                  { indexed: false, name: "epoch", type: "uint256" },
                ],
              },
              fromBlock: startBlock,
              toBlock: endBlock,
            }),

            // Claim requested events from Hook
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
              event: {
                type: "event",
                name: "ClaimRequested",
                inputs: [
                  { indexed: true, name: "policyId", type: "uint256" },
                  { indexed: false, name: "commitmentC", type: "bytes32" },
                ],
              },
              fromBlock: startBlock,
              toBlock: endBlock,
            }),

            // Claim attested events from AVS Manager
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
              event: {
                type: "event",
                name: "ClaimAttested",
                inputs: [
                  { indexed: true, name: "policyId", type: "uint256" },
                  { indexed: false, name: "attestationHash", type: "bytes" },
                ],
              },
              fromBlock: startBlock,
              toBlock: endBlock,
            }),

            // Claim settled events from AVS Manager
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
              event: {
                type: "event",
                name: "ClaimSettled",
                inputs: [
                  { indexed: true, name: "policyId", type: "uint256" },
                  { indexed: false, name: "payout", type: "uint256" },
                  { indexed: true, name: "to", type: "address" },
                ],
              },
              fromBlock: startBlock,
              toBlock: endBlock,
            }),

            // Premium skimmed events from Hook
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
              event: {
                type: "event",
                name: "PremiumSkimmed",
                inputs: [
                  { indexed: true, name: "pool", type: "address" },
                  { indexed: false, name: "amount", type: "uint256" },
                ],
              },
              fromBlock: startBlock,
              toBlock: endBlock,
            }),
          ]);

        // Parse and set events
        setEvents({
          policiesCreated: policyCreatedLogs.map(parsePolicyCreatedEvent),
          claimsRequested: claimRequestedLogs.map(parseClaimRequestedEvent),
          claimsAttested: claimAttestedLogs.map(parseClaimAttestedEvent),
          claimsSettled: claimSettledLogs.map(parseClaimSettledEvent),
          premiumsSkimmed: premiumSkimmedLogs.map(parsePremiumSkimmedEvent),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch events");
        console.error("Event fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [publicClient]
  );

  // Real-time event subscription
  useEffect(() => {
    if (!publicClient) return;

    const unsubscribes: (() => void)[] = [];

    // Subscribe to PolicyCreated events
    const unsubPolicyCreated = publicClient.watchEvent({
      address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
      event: {
        type: "event",
        name: "PolicyCreated",
        inputs: [
          { indexed: true, name: "policyId", type: "uint256" },
          { indexed: true, name: "lp", type: "address" },
          { indexed: true, name: "pool", type: "address" },
          { indexed: false, name: "epoch", type: "uint256" },
        ],
      },
      onLogs: logs => {
        const newEvents = logs.map(parsePolicyCreatedEvent);
        setEvents(prev => ({
          ...prev,
          policiesCreated: [...prev.policiesCreated, ...newEvents].sort((a, b) =>
            Number(b.blockNumber - a.blockNumber)
          ),
        }));
      },
    });
    unsubscribes.push(unsubPolicyCreated);

    // Subscribe to ClaimRequested events
    const unsubClaimRequested = publicClient.watchEvent({
      address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
      event: {
        type: "event",
        name: "ClaimRequested",
        inputs: [
          { indexed: true, name: "policyId", type: "uint256" },
          { indexed: false, name: "commitmentC", type: "bytes32" },
        ],
      },
      onLogs: logs => {
        const newEvents = logs.map(parseClaimRequestedEvent);
        setEvents(prev => ({
          ...prev,
          claimsRequested: [...prev.claimsRequested, ...newEvents].sort((a, b) =>
            Number(b.blockNumber - a.blockNumber)
          ),
        }));
      },
    });
    unsubscribes.push(unsubClaimRequested);

    // Subscribe to ClaimSettled events
    const unsubClaimSettled = publicClient.watchEvent({
      address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
      event: {
        type: "event",
        name: "ClaimSettled",
        inputs: [
          { indexed: true, name: "policyId", type: "uint256" },
          { indexed: false, name: "payout", type: "uint256" },
          { indexed: true, name: "to", type: "address" },
        ],
      },
      onLogs: logs => {
        const newEvents = logs.map(parseClaimSettledEvent);
        setEvents(prev => ({
          ...prev,
          claimsSettled: [...prev.claimsSettled, ...newEvents].sort((a, b) => Number(b.blockNumber - a.blockNumber)),
        }));
      },
    });
    unsubscribes.push(unsubClaimSettled);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [publicClient]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchHistoricalEvents();
  }, [fetchHistoricalEvents]);

  return {
    events,
    isLoading,
    error,
    refetch: fetchHistoricalEvents,
  };
}

// Policy-specific event monitoring
export function usePolicyEvents(policyId: bigint) {
  const { events } = useEventMonitor();

  const policyEvents = {
    created: events.policiesCreated.find(e => e.policyId === policyId),
    claimRequested: events.claimsRequested.find(e => e.policyId === policyId),
    claimAttested: events.claimsAttested.find(e => e.policyId === policyId),
    claimSettled: events.claimsSettled.find(e => e.policyId === policyId),
  };

  const status = policyEvents.claimSettled
    ? "settled"
    : policyEvents.claimAttested
    ? "attested"
    : policyEvents.claimRequested
    ? "claimed"
    : policyEvents.created
    ? "active"
    : "unknown";

  return {
    ...policyEvents,
    status,
  };
}

// Pool-specific event monitoring
export function usePoolEvents(poolAddress: string) {
  const { events } = useEventMonitor();

  const poolEvents = {
    policiesCreated: events.policiesCreated.filter(e => e.pool.toLowerCase() === poolAddress.toLowerCase()),
    premiumsSkimmed: events.premiumsSkimmed.filter(e => e.pool.toLowerCase() === poolAddress.toLowerCase()),
  };

  const totalPremiums = poolEvents.premiumsSkimmed.reduce((sum, event) => sum + event.amount, BigInt(0));

  const activePolicies = poolEvents.policiesCreated.length;

  return {
    ...poolEvents,
    totalPremiums,
    activePolicies,
  };
}

// User-specific event monitoring
export function useUserEvents(userAddress: string) {
  const { events } = useEventMonitor();

  const userEvents = {
    policiesCreated: events.policiesCreated.filter(e => e.lp.toLowerCase() === userAddress.toLowerCase()),
    claimsSettled: events.claimsSettled.filter(e => e.to.toLowerCase() === userAddress.toLowerCase()),
  };

  const totalPayouts = userEvents.claimsSettled.reduce((sum, event) => sum + event.payout, BigInt(0));

  return {
    ...userEvents,
    totalPayouts,
    activePolicies: userEvents.policiesCreated.length,
  };
}

export { useEventMonitor as default };

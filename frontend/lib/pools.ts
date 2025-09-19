import { useCallback, useState, useEffect } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { Address, formatEther, getContract } from "viem";
import { sepolia } from "wagmi/chains";

// Uniswap V4 PoolManager address on Sepolia
const POOL_MANAGER_ADDRESS = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543" as const;

// Basic ERC20 ABI for token info
const ERC20_ABI = [
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
] as const;

// Uniswap V4 PoolManager ABI (minimal for pool queries)
const POOL_MANAGER_ABI = [
  {
    type: "function",
    name: "getSlot0",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLiquidity",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPosition",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Initialize",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "currency0", type: "address", indexed: true },
      { name: "currency1", type: "address", indexed: true },
      { name: "fee", type: "uint24", indexed: false },
      { name: "tickSpacing", type: "int24", indexed: false },
      { name: "hooks", type: "address", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "tick", type: "int24", indexed: false },
    ],
  },
] as const;

// Known Sepolia testnet tokens
const SEPOLIA_TOKENS: Record<string, { name: string; symbol: string; decimals: number }> = {
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984": { name: "Uniswap", symbol: "UNI", decimals: 18 },
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": { name: "Wrapped BTC", symbol: "WBTC", decimals: 8 },
  "0xa0B86a33E6410c0f35f9A4A5b2d0e93f5c4dD35B": { name: "USD Coin", symbol: "USDC", decimals: 6 },
  "0x779877A7B0D9E8603169DdbD7836e478b4624789": { name: "ChainLink Token", symbol: "LINK", decimals: 18 },
  "0x0000000000000000000000000000000000000000": { name: "Ethereum", symbol: "ETH", decimals: 18 },
};

export interface PoolInfo {
  id: string;
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
  token0: {
    name: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    name: string;
    symbol: string;
    decimals: number;
  };
  sqrtPriceX96?: bigint;
  tick?: number;
  displayName: string;
  tvl?: bigint;
  volume24h?: bigint;
  feeTier: string;
  // For insurance system - use PoolManager address as pool identifier
  poolManagerAddress?: Address;
}

// Hook to fetch token information
export function useTokenInfo(tokenAddress: Address) {
  const publicClient = usePublicClient();
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    decimals: number;
  } | null>(null);

  useEffect(() => {
    if (!publicClient || !tokenAddress) return;

    const fetchTokenInfo = async () => {
      try {
        // Check if we have cached info for known tokens
        if (SEPOLIA_TOKENS[tokenAddress]) {
          setTokenInfo(SEPOLIA_TOKENS[tokenAddress]);
          return;
        }

        // Handle ETH (zero address)
        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
          setTokenInfo({ name: "Ethereum", symbol: "ETH", decimals: 18 });
          return;
        }

        // Fetch from contract
        const contract = getContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          client: publicClient,
        });

        const [name, symbol, decimals] = await Promise.all([
          contract.read.name(),
          contract.read.symbol(),
          contract.read.decimals(),
        ]);

        setTokenInfo({ name, symbol, decimals });
      } catch (error) {
        console.warn(`Failed to fetch token info for ${tokenAddress}:`, error);
        // Fallback to unknown token
        setTokenInfo({
          name: "Unknown Token",
          symbol: tokenAddress.slice(0, 6) + "...",
          decimals: 18,
        });
      }
    };

    fetchTokenInfo();
  }, [publicClient, tokenAddress]);

  return tokenInfo;
}

// Hook to fetch available Uniswap V4 pools
export function useUniswapV4Pools() {
  const publicClient = usePublicClient();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient) return;

    const fetchPools = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current block number
        const currentBlock = await publicClient.getBlockNumber();

        // For Sepolia, we'll look back a conservative number of blocks
        // Start with recent blocks (last 1000 blocks = ~3-4 hours on Sepolia)
        let fromBlock = currentBlock - BigInt(1000);

        // Ensure we don't go below 0
        if (fromBlock < BigInt(0)) {
          fromBlock = BigInt(0);
        }

        console.log(`Fetching pool events from block ${fromBlock} to ${currentBlock}`);

        // Get Initialize events from PoolManager to find all pools
        const logs = await publicClient.getLogs({
          address: POOL_MANAGER_ADDRESS,
          event: {
            type: "event",
            name: "Initialize",
            inputs: [
              { name: "poolId", type: "bytes32", indexed: true },
              { name: "currency0", type: "address", indexed: true },
              { name: "currency1", type: "address", indexed: true },
              { name: "fee", type: "uint24", indexed: false },
              { name: "tickSpacing", type: "int24", indexed: false },
              { name: "hooks", type: "address", indexed: false },
              { name: "sqrtPriceX96", type: "uint160", indexed: false },
              { name: "tick", type: "int24", indexed: false },
            ],
          },
          fromBlock,
          toBlock: currentBlock,
        });

        console.log(`Found ${logs.length} pool initialization events`);

        // Create pool infos from events
        const poolPromises = logs.map(async log => {
          const { args } = log;
          if (!args) return null;

          const { poolId, currency0, currency1, fee, tickSpacing, hooks, sqrtPriceX96, tick } = args;

          // Get token info for both tokens
          const token0Promise = fetchTokenInfo(currency0 as Address);
          const token1Promise = fetchTokenInfo(currency1 as Address);

          const [token0, token1] = await Promise.all([token0Promise, token1Promise]);

          const feeTierDisplay = (Number(fee) / 10000).toFixed(2) + "%";
          const displayName = `${token0.symbol}/${token1.symbol} ${feeTierDisplay}`;

          return {
            id: poolId as string,
            currency0: currency0 as Address,
            currency1: currency1 as Address,
            fee: Number(fee),
            tickSpacing: Number(tickSpacing),
            hooks: hooks as Address,
            token0,
            token1,
            sqrtPriceX96: sqrtPriceX96 as bigint,
            tick: Number(tick),
            displayName,
            feeTier: feeTierDisplay,
            poolManagerAddress: POOL_MANAGER_ADDRESS,
          } as PoolInfo;
        });

        const poolInfos = (await Promise.all(poolPromises)).filter(Boolean) as PoolInfo[];

        if (poolInfos.length === 0) {
          console.warn("No pools found in recent blocks, using fallback pools for testing");
          // If no pools found, provide some test pools
          const fallbackPools: PoolInfo[] = [
            {
              id: "0x0000000000000000000000000000000000000000000000000000000000000001",
              currency0: "0x0000000000000000000000000000000000000000" as Address,
              currency1: "0xa0B86a33E6410c0f35f9A4A5b2d0e93f5c4dD35B" as Address,
              fee: 3000,
              tickSpacing: 60,
              hooks: (process.env.NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS ||
                "0x0000000000000000000000000000000000000000") as Address,
              token0: { name: "Ethereum", symbol: "ETH", decimals: 18 },
              token1: { name: "USD Coin", symbol: "USDC", decimals: 6 },
              displayName: "ETH/USDC 0.30%",
              feeTier: "0.30%",
              poolManagerAddress: POOL_MANAGER_ADDRESS,
            },
            {
              id: "0x0000000000000000000000000000000000000000000000000000000000000002",
              currency0: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as Address,
              currency1: "0x0000000000000000000000000000000000000000" as Address,
              fee: 3000,
              tickSpacing: 60,
              hooks: (process.env.NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS ||
                "0x0000000000000000000000000000000000000000") as Address,
              token0: { name: "Uniswap", symbol: "UNI", decimals: 18 },
              token1: { name: "Ethereum", symbol: "ETH", decimals: 18 },
              displayName: "UNI/ETH 0.30%",
              feeTier: "0.30%",
              poolManagerAddress: POOL_MANAGER_ADDRESS,
            },
          ];
          setPools(fallbackPools);
          console.log("Using fallback pools for testing:", fallbackPools);
        } else {
          setPools(poolInfos);
          console.log(`Loaded ${poolInfos.length} real pools:`, poolInfos);
        }
      } catch (err) {
        console.error("Error fetching pools:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch pools";
        setError(errorMessage);

        // On error, still provide fallback pools so the app is usable
        const fallbackPools: PoolInfo[] = [
          {
            id: "0x0000000000000000000000000000000000000000000000000000000000000001",
            currency0: "0x0000000000000000000000000000000000000000" as Address,
            currency1: "0xa0B86a33E6410c0f35f9A4A5b2d0e93f5c4dD35B" as Address,
            fee: 3000,
            tickSpacing: 60,
            hooks: process.env.NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS as Address,
            token0: { name: "Ethereum", symbol: "ETH", decimals: 18 },
            token1: { name: "USD Coin", symbol: "USDC", decimals: 6 },
            displayName: "ETH/USDC 0.30%",
            feeTier: "0.30%",
            poolManagerAddress: POOL_MANAGER_ADDRESS,
          },
          {
            id: "0x0000000000000000000000000000000000000000000000000000000000000002",
            currency0: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as Address,
            currency1: "0x0000000000000000000000000000000000000000" as Address,
            fee: 3000,
            tickSpacing: 60,
            hooks: process.env.NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS as Address,
            token0: { name: "Uniswap", symbol: "UNI", decimals: 18 },
            token1: { name: "Ethereum", symbol: "ETH", decimals: 18 },
            displayName: "UNI/ETH 0.30%",
            feeTier: "0.30%",
            poolManagerAddress: POOL_MANAGER_ADDRESS,
          },
        ];
        setPools(fallbackPools);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPools();
  }, [publicClient]);

  const fetchTokenInfo = async (address: Address) => {
    if (SEPOLIA_TOKENS[address]) {
      return SEPOLIA_TOKENS[address];
    }

    if (address === "0x0000000000000000000000000000000000000000") {
      return { name: "Ethereum", symbol: "ETH", decimals: 18 };
    }

    try {
      const contract = getContract({
        address,
        abi: ERC20_ABI,
        client: publicClient!,
      });

      const [name, symbol, decimals] = await Promise.all([
        contract.read.name(),
        contract.read.symbol(),
        contract.read.decimals(),
      ]);

      return { name, symbol, decimals };
    } catch (error) {
      return {
        name: "Unknown Token",
        symbol: address.slice(0, 6) + "...",
        decimals: 18,
      };
    }
  };

  const refetch = useCallback(async () => {
    if (!publicClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // Force re-fetch by calling the fetch function directly
      const currentBlock = await publicClient.getBlockNumber();
      let fromBlock = currentBlock - BigInt(1000);

      if (fromBlock < BigInt(0)) {
        fromBlock = BigInt(0);
      }

      console.log(`Refetching pool events from block ${fromBlock} to ${currentBlock}`);

      const logs = await publicClient.getLogs({
        address: POOL_MANAGER_ADDRESS,
        event: {
          type: "event",
          name: "Initialize",
          inputs: [
            { name: "poolId", type: "bytes32", indexed: true },
            { name: "currency0", type: "address", indexed: true },
            { name: "currency1", type: "address", indexed: true },
            { name: "fee", type: "uint24", indexed: false },
            { name: "tickSpacing", type: "int24", indexed: false },
            { name: "hooks", type: "address", indexed: false },
            { name: "sqrtPriceX96", type: "uint160", indexed: false },
            { name: "tick", type: "int24", indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      console.log(`Refetch found ${logs.length} pool initialization events`);

      if (logs.length === 0) {
        // If no recent pools, try a larger range (but still within limits)
        const extendedFromBlock = currentBlock - BigInt(5000);
        console.log(`No recent pools found, extending search to block ${extendedFromBlock}`);

        const extendedLogs = await publicClient.getLogs({
          address: POOL_MANAGER_ADDRESS,
          event: {
            type: "event",
            name: "Initialize",
            inputs: [
              { name: "poolId", type: "bytes32", indexed: true },
              { name: "currency0", type: "address", indexed: true },
              { name: "currency1", type: "address", indexed: true },
              { name: "fee", type: "uint24", indexed: false },
              { name: "tickSpacing", type: "int24", indexed: false },
              { name: "hooks", type: "address", indexed: false },
              { name: "sqrtPriceX96", type: "uint160", indexed: false },
              { name: "tick", type: "int24", indexed: false },
            ],
          },
          fromBlock: extendedFromBlock,
          toBlock: currentBlock,
        });

        console.log(`Extended search found ${extendedLogs.length} pool events`);

        if (extendedLogs.length > 0) {
          // Process the extended logs
          const poolPromises = extendedLogs.map(async log => {
            const { args } = log;
            if (!args) return null;

            const { poolId, currency0, currency1, fee, tickSpacing, hooks, sqrtPriceX96, tick } = args;
            const [token0, token1] = await Promise.all([
              fetchTokenInfo(currency0 as Address),
              fetchTokenInfo(currency1 as Address),
            ]);

            const feeTierDisplay = (Number(fee) / 10000).toFixed(2) + "%";
            const displayName = `${token0.symbol}/${token1.symbol} ${feeTierDisplay}`;

            return {
              id: poolId as string,
              currency0: currency0 as Address,
              currency1: currency1 as Address,
              fee: Number(fee),
              tickSpacing: Number(tickSpacing),
              hooks: hooks as Address,
              token0,
              token1,
              sqrtPriceX96: sqrtPriceX96 as bigint,
              tick: Number(tick),
              displayName,
              feeTier: feeTierDisplay,
              poolManagerAddress: POOL_MANAGER_ADDRESS,
            } as PoolInfo;
          });

          const poolInfos = (await Promise.all(poolPromises)).filter(Boolean) as PoolInfo[];
          setPools(poolInfos);
          console.log(`Refetch loaded ${poolInfos.length} real pools`);
          return;
        }
      }

      // If we get here, no pools were found
      console.warn("No pools found in refetch, showing fallback pools");
      // Use fallback pools
      const fallbackPools: PoolInfo[] = [
        {
          id: "0x0000000000000000000000000000000000000000000000000000000000000001",
          currency0: "0x0000000000000000000000000000000000000000" as Address,
          currency1: "0xa0B86a33E6410c0f35f9A4A5b2d0e93f5c4dD35B" as Address,
          fee: 3000,
          tickSpacing: 60,
          hooks: (process.env.NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS ||
            "0x0000000000000000000000000000000000000000") as Address,
          token0: { name: "Ethereum", symbol: "ETH", decimals: 18 },
          token1: { name: "USD Coin", symbol: "USDC", decimals: 6 },
          displayName: "ETH/USDC 0.30%",
          feeTier: "0.30%",
          poolManagerAddress: POOL_MANAGER_ADDRESS,
        },
      ];
      setPools(fallbackPools);
    } catch (err) {
      console.error("Error in refetch:", err);
      setError(err instanceof Error ? err.message : "Failed to refetch pools");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  return { pools, isLoading, error, refetch };
}

// Hook to get specific pool data
export function usePoolData(poolId: string) {
  const { pools } = useUniswapV4Pools();
  const pool = pools.find(p => p.id === poolId || p.currency0 === poolId || p.currency1 === poolId);

  return {
    pool,
    isLoading: !pool,
    error: !pool ? "Pool not found" : null,
  };
}

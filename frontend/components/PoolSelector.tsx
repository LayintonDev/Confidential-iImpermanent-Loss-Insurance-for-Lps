"use client";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  DollarSign,
  Activity,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shield,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { Address, formatEther } from "viem";
import { useUniswapV4Pools, PoolInfo } from "@/lib/pools";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONFIDENTIAL_IL_HOOK_ABI } from "@/lib/contracts";

// Hook to check if a pool supports insurance
function usePoolInsuranceStatus(poolAddress: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.HOOK as Address,
    abi: CONFIDENTIAL_IL_HOOK_ABI,
    functionName: "whitelistedPools",
    args: [poolAddress],
  });
}

interface PoolSelectorProps {
  selectedPoolId?: string;
  onPoolSelect: (pool: PoolInfo) => void;
  className?: string;
}

// Pool card component with insurance status
function PoolCard({ pool, isSelected, onSelect }: { pool: PoolInfo; isSelected: boolean; onSelect: () => void }) {
  const insuranceStatus = usePoolInsuranceStatus(pool.currency0);
  const isInsuranceEnabled = insuranceStatus?.data || false;

  return (
    <motion.div
      key={pool.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-green-500/50 bg-green-500/10 ring-1 ring-green-500/20"
          : "border-gray-600 bg-gray-800/30 hover:border-blue-500/50 hover:bg-blue-500/5"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
              {pool.token0.symbol.charAt(0)}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {pool.token1.symbol.charAt(0)}
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium">{pool.displayName}</h3>
            <p className="text-gray-400 text-sm">
              {pool.token0.name} / {pool.token1.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Insurance Status */}
          <div className="text-center">
            {insuranceStatus?.isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mx-auto mb-1"></div>
            ) : isInsuranceEnabled ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400 mb-1">
                <Shield className="h-3 w-3 mr-1" />
                Insurable
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-500/30 text-red-400 mb-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                No Insurance
              </Badge>
            )}
            <p className="text-xs text-gray-400">Status</p>
          </div>

          {/* Fee Tier */}
          <div className="text-center">
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 mb-1">
              {pool.feeTier}
            </Badge>
            <p className="text-xs text-gray-400">Fee Tier</p>
          </div>

          {/* Hook Status */}
          {pool.hooks && pool.hooks !== "0x0000000000000000000000000000000000000000" ? (
            <div className="text-center">
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 mb-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                V4
              </Badge>
              <p className="text-xs text-gray-400">Hooks</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Pool Metrics */}
      {(pool.tvl || pool.volume24h) && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {pool.tvl && (
              <div>
                <span className="text-gray-400">TVL:</span>
                <span className="text-white ml-2">{formatEther(pool.tvl)} ETH</span>
              </div>
            )}
            {pool.volume24h && (
              <div>
                <span className="text-gray-400">24h Volume:</span>
                <span className="text-white ml-2">{formatEther(pool.volume24h)} ETH</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function PoolSelector({ selectedPoolId, onPoolSelect, className = "" }: PoolSelectorProps) {
  const { pools, isLoading, error, refetch } = useUniswapV4Pools();
  const [searchTerm, setSearchTerm] = useState("");
  const [feeFilter, setFeeFilter] = useState<string>("all");

  // Filter pools based on search and fee filter
  const filteredPools = pools.filter(pool => {
    const matchesSearch =
      pool.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.token0.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.token1.symbol.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFee = feeFilter === "all" || pool.feeTier === feeFilter;

    return matchesSearch && matchesFee;
  });

  // Get unique fee tiers for filter
  const feeTiers = Array.from(new Set(pools.map(pool => pool.feeTier))).sort();

  const handlePoolSelect = (pool: PoolInfo) => {
    onPoolSelect(pool);
  };

  if (isLoading) {
    return (
      <Card className={`bg-black/60 border-blue-500/30 ${className}`}>
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            Loading Uniswap V4 Pools
          </CardTitle>
          <CardDescription>Fetching available pools from Sepolia testnet...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-700/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-black/60 border-red-500/30 ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Pool Loading Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refetch} variant="outline" className="w-full border-red-500/30 text-red-400">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading Pools
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (pools.length === 0) {
    return (
      <Card className={`bg-black/60 border-gray-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-gray-400">No Pools Found</CardTitle>
          <CardDescription>No Uniswap V4 pools are available on Sepolia testnet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-4">
              It looks like there are no V4 pools deployed yet, or they haven't been indexed.
            </p>
            <Button onClick={refetch} variant="outline" className="border-gray-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-black/60 border-blue-500/30 ${className}`}>
      <CardHeader>
        <CardTitle className="text-blue-400 flex items-center justify-between">
          <span>Select Pool for Insurance</span>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400">
            {pools.length} pools
          </Badge>
        </CardTitle>
        <CardDescription>Choose a Uniswap V4 pool to insure against impermanent loss</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search pools by token symbol..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-600 text-white"
            />
          </div>
          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-32 bg-gray-800/50 border-gray-600">
              <SelectValue placeholder="Fee tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fees</SelectItem>
              {feeTiers.map(tier => (
                <SelectItem key={tier} value={tier}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pool List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPools.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2" />
              <p>No pools match your search criteria</p>
            </div>
          ) : (
            filteredPools.map(pool => (
              <PoolCard
                key={pool.id}
                pool={pool}
                isSelected={selectedPoolId === pool.id}
                onSelect={() => handlePoolSelect(pool)}
              />
            ))
          )}
        </div>

        {filteredPools.length > 0 && (
          <div className="pt-3 border-t border-gray-600">
            <p className="text-xs text-gray-400 text-center">
              {filteredPools.length} of {pools.length} pools shown •
              <a
                href={`https://sepolia.etherscan.io/address/${
                  process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || POOL_MANAGER_ADDRESS
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 ml-1"
              >
                View PoolManager on Etherscan <ExternalLink className="h-3 w-3 inline ml-1" />
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export the PoolManager address for reference
export const POOL_MANAGER_ADDRESS = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

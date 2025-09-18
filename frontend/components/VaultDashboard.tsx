import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Wallet, DollarSign, Shield, TrendingUp, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useInsuranceVault } from "@/lib/contracts";
import { formatEther } from "viem";

interface VaultDashboardProps {
  poolAddress: string;
  className?: string;
}

interface VaultStats {
  totalPremiums: bigint;
  availableReserves: bigint;
  totalPaid: bigint;
  reserveRatio: bigint;
}

export function VaultDashboard({ poolAddress, className = "" }: VaultDashboardProps) {
  const { getVaultStats, getTotalPremiums, getReserves } = useInsuranceVault();

  // Get vault statistics
  const { data: vaultStats, isLoading: statsLoading, refetch: refetchStats } = getVaultStats(poolAddress);
  const { data: totalPremiums, isLoading: premiumsLoading } = getTotalPremiums(poolAddress);
  const { data: reserves, isLoading: reservesLoading } = getReserves(poolAddress);

  const stats = vaultStats as VaultStats | undefined;
  const isLoading = statsLoading || premiumsLoading || reservesLoading;

  const formatAmount = (amount: bigint, decimals = 18) => {
    return Number(formatEther(amount)).toFixed(4);
  };

  const getReserveRatioStatus = (ratio: bigint) => {
    const ratioPercent = Number(ratio) / 100;
    if (ratioPercent >= 50) return { color: "green", label: "Healthy" };
    if (ratioPercent >= 20) return { color: "yellow", label: "Moderate" };
    return { color: "red", label: "Low" };
  };

  const handleRefresh = () => {
    refetchStats();
  };

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Insurance Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const reserveStatus = stats ? getReserveRatioStatus(stats.reserveRatio) : { color: "gray", label: "Unknown" };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className={`${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <CardTitle>Insurance Vault</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Real-time fund management and reserve status</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Reserve Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Reserve Ratio</span>
              </div>
              <Badge
                variant={
                  reserveStatus.color === "green"
                    ? "default"
                    : reserveStatus.color === "yellow"
                    ? "secondary"
                    : "destructive"
                }
              >
                {reserveStatus.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Current Ratio</span>
                <span className="font-mono">{stats ? (Number(stats.reserveRatio) / 100).toFixed(1) : "0.0"}%</span>
              </div>
              <Progress value={stats ? Number(stats.reserveRatio) / 100 : 0} className="h-2" />
            </div>
          </div>

          <Separator />

          {/* Financial Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Total Premiums
              </div>
              <div className="text-2xl font-mono">{stats ? formatAmount(stats.totalPremiums) : "0.0000"} ETH</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-blue-500" />
                Available Reserves
              </div>
              <div className="text-2xl font-mono">{stats ? formatAmount(stats.availableReserves) : "0.0000"} ETH</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Claims Paid
              </div>
              <div className="text-2xl font-mono">{stats ? formatAmount(stats.totalPaid) : "0.0000"} ETH</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-gray-500" />
                Utilization
              </div>
              <div className="text-2xl font-mono">
                {stats && stats.totalPremiums > BigInt(0)
                  ? ((Number(stats.totalPaid) / Number(stats.totalPremiums)) * 100).toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
          </div>

          <Separator />

          {/* Health Indicators */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Vault Health</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Minimum Reserve Ratio:</span>
                <span className="font-mono">20.0%</span>
              </div>
              <div className="flex justify-between">
                <span>Maximum Claim Ratio:</span>
                <span className="font-mono">80.0%</span>
              </div>
              <div className="flex justify-between">
                <span>Pool Address:</span>
                <span className="font-mono text-xs">
                  {poolAddress ? `${poolAddress.slice(0, 6)}...${poolAddress.slice(-4)}` : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {stats && Number(stats.reserveRatio) < 2000 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Low Reserve Warning</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Reserve ratio is below the healthy threshold. New claims may be restricted.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default VaultDashboard;

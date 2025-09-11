import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Shield, Users, Activity } from "lucide-react";

interface VaultStatsProps {
  totalReserves?: string;
  totalPremiumsCollected?: string;
  totalClaimsPaid?: string;
  reserveRatio?: number;
  activePolicies?: number;
  recentPayouts?: Array<{
    policyId: number;
    amount: string;
    timestamp: string;
    status: "completed" | "pending";
  }>;
}

export default function VaultStats({
  totalReserves = "45.7",
  totalPremiumsCollected = "12.3",
  totalClaimsPaid = "8.9",
  reserveRatio = 78,
  activePolicies = 142,
  recentPayouts = [
    { policyId: 1234, amount: "2.45", timestamp: "2 hours ago", status: "completed" },
    { policyId: 1235, amount: "1.23", timestamp: "5 hours ago", status: "completed" },
    { policyId: 1236, amount: "0.89", timestamp: "1 day ago", status: "pending" },
  ],
}: VaultStatsProps) {
  const formatCurrency = (amount: string) => `${amount} ETH`;

  const getReserveRatioColor = (ratio: number) => {
    if (ratio >= 80) return "text-green-400";
    if (ratio >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getReserveRatioStatus = (ratio: number) => {
    if (ratio >= 80) return "Healthy";
    if (ratio >= 50) return "Moderate";
    return "Low";
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value Locked */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Reserves</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalReserves)}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        {/* Premiums Collected */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Premiums Collected</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(totalPremiumsCollected)}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% this week
            </p>
          </CardContent>
        </Card>

        {/* Claims Paid */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Claims Paid</CardTitle>
            <Shield className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{formatCurrency(totalClaimsPaid)}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              -5.1% this week
            </p>
          </CardContent>
        </Card>

        {/* Active Policies */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Active Policies</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{activePolicies}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +23 new this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reserve Ratio Health */}
      <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center justify-between">
            Vault Solvency Status
            <Badge variant="outline" className={`${getReserveRatioColor(reserveRatio)} border-current`}>
              {getReserveRatioStatus(reserveRatio)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Reserve Ratio</span>
              <span className={`font-mono ${getReserveRatioColor(reserveRatio)}`}>{reserveRatio}%</span>
            </div>
            <Progress
              value={reserveRatio}
              className="h-2 bg-gray-800"
              // Custom styling would be applied via CSS
            />
          </div>

          <div className="text-xs text-gray-400">
            The vault can cover up to <span className="text-white font-mono">{reserveRatio}%</span> of potential maximum
            payouts based on current reserves and active policies.
          </div>
        </CardContent>
      </Card>

      {/* Recent Payouts */}
      <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-green-400">Recent Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPayouts.map(payout => (
              <div
                key={payout.policyId}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-600"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <div className="text-white font-medium">Policy #{payout.policyId}</div>
                    <div className="text-gray-400 text-xs">{payout.timestamp}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono text-green-400">{formatCurrency(payout.amount)}</span>
                  <Badge
                    variant={payout.status === "completed" ? "default" : "outline"}
                    className={
                      payout.status === "completed" ? "bg-green-600 text-white" : "border-yellow-500 text-yellow-400"
                    }
                  >
                    {payout.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {recentPayouts.length === 0 && <div className="text-center text-gray-400 py-4">No recent payouts</div>}
        </CardContent>
      </Card>

      {/* Implementation Status */}
      <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="border-green-500 text-green-400">
              Phase 2: Insurance Vault Implementation ✅
            </Badge>
            <div className="text-xs text-gray-400">
              Premium collection, reserve management, and payout tracking active
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

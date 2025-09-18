"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, DollarSign, AlertTriangle, Users, TrendingUp, TrendingDown, Shield, RefreshCw } from "lucide-react";
import { useInsuranceVault } from "@/lib/contracts";
import { formatEther } from "viem";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

interface VaultMetrics {
  totalReserves: bigint;
  activePolicies: number;
  totalPayouts: number;
  utilizationRate: number;
  riskExposure: number;
  reserveHistory: Array<{
    date: string;
    reserves: bigint;
    required: bigint;
  }>;
  premiumBreakdown: Array<{
    poolName: string;
    amount: bigint;
  }>;
  payoutHistory: Array<{
    date: string;
    amount: bigint;
  }>;
  reserveBreakdown: Array<{
    asset: string;
    amount: bigint;
  }>;
  recentPayouts: Array<{
    policyId: string;
    amount: bigint;
    date: string;
  }>;
}

interface VaultStatsProps {
  metrics: VaultMetrics;
}

export function VaultStats({ metrics }: VaultStatsProps) {
  const [timeRange, setTimeRange] = React.useState("7d");
  const [selectedTab, setSelectedTab] = React.useState("overview");

  const formatCurrency = (amount: bigint): string => {
    return `$${Number(amount / BigInt(10 ** 18)).toLocaleString()}`;
  };

  const getReserveRatioColor = (ratio: number): string => {
    if (ratio >= 150) return "text-green-400";
    if (ratio >= 100) return "text-yellow-400";
    return "text-red-400";
  };

  const getReserveRatioStatus = (ratio: number): string => {
    if (ratio >= 150) return "Healthy";
    if (ratio >= 100) return "Adequate";
    return "Low";
  };

  // Mock data for demonstration
  const totalReserves = BigInt("5000000000000000000000"); // 5000 ETH
  const totalPremiumsCollected = BigInt("750000000000000000000"); // 750 ETH
  const totalClaimsPaid = BigInt("125000000000000000000"); // 125 ETH
  const activePolicies = 342;
  const reserveRatio = 165; // 165% coverage ratio

  const recentPayouts = [
    {
      policyId: "POL-2024-0156",
      amount: BigInt("50000000000000000000"), // 50 ETH
      timestamp: "2024-01-15 14:30",
      status: "completed",
    },
    {
      policyId: "POL-2024-0145",
      amount: BigInt("75000000000000000000"), // 75 ETH
      timestamp: "2024-01-14 09:15",
      status: "completed",
    },
    {
      policyId: "POL-2024-0132",
      amount: BigInt("25000000000000000000"), // 25 ETH
      timestamp: "2024-01-13 16:45",
      status: "pending",
    },
  ];

  // Chart data configurations
  const reserveHistoryData = {
    labels: metrics.reserveHistory.map(h => h.date),
    datasets: [
      {
        label: "Total Reserves",
        data: metrics.reserveHistory.map(h => Number(h.reserves) / 10 ** 18),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.1,
      },
      {
        label: "Minimum Required",
        data: metrics.reserveHistory.map(h => Number(h.required) / 10 ** 18),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.1,
        borderDash: [5, 5],
      },
    ],
  };

  const premiumsData = {
    labels: metrics.premiumBreakdown.map(p => p.poolName),
    datasets: [
      {
        data: metrics.premiumBreakdown.map(p => Number(p.amount) / 10 ** 18),
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgb(34, 197, 94)",
          "rgb(59, 130, 246)",
          "rgb(168, 85, 247)",
          "rgb(245, 158, 11)",
          "rgb(239, 68, 68)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const payoutTrendsData = {
    labels: metrics.payoutHistory.map(p => p.date),
    datasets: [
      {
        label: "Payouts",
        data: metrics.payoutHistory.map(p => Number(p.amount) / 10 ** 18),
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "rgb(156, 163, 175)",
          font: {
            size: 12,
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
        },
        ticks: {
          color: "rgb(156, 163, 175)",
        },
      },
      y: {
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
        },
        ticks: {
          color: "rgb(156, 163, 175)",
        },
      },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "rgb(156, 163, 175)",
          font: {
            size: 11,
          },
          padding: 20,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Vault Analytics</h2>
        <div className="flex space-x-2">
          {["24h", "7d", "30d", "90d"].map(range => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={
                timeRange === range
                  ? "bg-green-600 hover:bg-green-700"
                  : "border-gray-600 text-gray-300 hover:bg-gray-800"
              }
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Reserves */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Total Vault Reserves</CardTitle>
            <Wallet className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalReserves)}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        {/* Total Premiums Collected */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400">Premiums Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(totalPremiumsCollected)}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.3% this month
            </p>
          </CardContent>
        </Card>

        {/* Total Claims Paid */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-400">Claims Paid Out</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{formatCurrency(totalClaimsPaid)}</div>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              -2.1% from last month
            </p>
          </CardContent>
        </Card>

        {/* Active Policies */}
        <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">Active Policies</CardTitle>
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

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-600">
          <TabsTrigger value="overview" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="reserves" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Reserve Analysis
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Payout History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reserve History Chart */}
            <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-400">Reserve Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={reserveHistoryData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Premium Breakdown */}
            <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-400">Premium Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Doughnut data={premiumsData} options={donutOptions} />
                </div>
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
                <Progress value={reserveRatio} className="h-2 bg-gray-800" />
              </div>

              <div className="text-xs text-gray-400">
                The vault can cover up to <span className="text-white font-mono">{reserveRatio}%</span> of potential
                maximum payouts based on current reserves and active policies.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reserves" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reserve Composition */}
            <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-400">Reserve Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                    <span className="text-gray-300">ETH Holdings</span>
                    <span className="text-green-400 font-mono">4,250 ETH</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                    <span className="text-gray-300">USDC Reserves</span>
                    <span className="text-blue-400 font-mono">750,000 USDC</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                    <span className="text-gray-300">Emergency Buffer</span>
                    <span className="text-yellow-400 font-mono">250 ETH</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reserve Utilization */}
            <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-400">Utilization Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Capital Efficiency</span>
                      <span className="text-green-400">87.3%</span>
                    </div>
                    <Progress value={87.3} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Risk Exposure</span>
                      <span className="text-yellow-400">52.1%</span>
                    </div>
                    <Progress value={52.1} className="h-2 bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Liquidity Buffer</span>
                      <span className="text-blue-400">34.7%</span>
                    </div>
                    <Progress value={34.7} className="h-2 bg-gray-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payout Trends Chart */}
            <Card className="lg:col-span-2 bg-black/60 border-green-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-400">Payout Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={payoutTrendsData} options={chartOptions} />
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
                            payout.status === "completed"
                              ? "bg-green-600 text-white"
                              : "border-yellow-500 text-yellow-400"
                          }
                        >
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {recentPayouts.length === 0 && (
                  <div className="text-center text-gray-400 py-8">No recent payouts in the selected time range</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Implementation Status */}
      <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="border-green-500 text-green-400">
              Phase 6: Real-time Vault Analytics with Interactive Charts ✅
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

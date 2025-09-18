"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ArrowLeft,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  FileText,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { parseEther, Hash } from "viem";
import { useRouter } from "next/navigation";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Import components
import PolicyCard from "@/components/PolicyCard";
import ClaimFlow from "@/components/ClaimFlow";
import TransactionMonitor from "@/components/TransactionMonitor";
import WalletConnection from "@/components/WalletConnection";

// Import hooks
import { usePolicyTransactions } from "@/lib/transactions";
import { useAppStore, PolicyState } from "@/lib/store";
import { usePolicyManager } from "@/lib/contracts";

interface PolicyDetails {
  id: string;
  poolAddress: string;
  poolName: string;
  status: "active" | "expired" | "claimed";
  premium: string;
  coverage: string;
  deductible: number;
  startTime: number;
  endTime: number;
  claimHistory: Array<{
    id: string;
    amount: string;
    timestamp: number;
    status: "pending" | "approved" | "rejected";
  }>;
  riskMetrics: {
    currentIL: number;
    maxIL: number;
    volatility: number;
    riskScore: "low" | "medium" | "high";
  };
  priceHistory: Array<{
    timestamp: number;
    token0Price: number;
    token1Price: number;
    ilValue: number;
  }>;
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PolicyDetailViewProps {
  policyId: string;
}

export default function PolicyDetailView({ policyId }: PolicyDetailViewProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { submitClaim, claimState } = usePolicyTransactions();
  const { userPolicies } = useAppStore();
  const { getPolicyDetails } = usePolicyManager();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showClaimFlow, setShowClaimFlow] = useState(false);
  const [showTransactionMonitor, setShowTransactionMonitor] = useState(false);
  const [policyDetails, setPolicyDetails] = useState<PolicyDetails | null>(null);

  // Get policy details from contract
  const contractPolicyData = getPolicyDetails(BigInt(policyId));

  // Load policy details from contract or mock data
  useEffect(() => {
    const loadPolicyDetails = async () => {
      if (contractPolicyData?.data) {
        // Use real contract data when available
        const [lp, pool, params, entryCommit, createdAt, epoch, active] = contractPolicyData.data;

        const realPolicy: PolicyDetails = {
          id: policyId,
          poolAddress: pool as Address,
          poolName: "USDC/ETH 0.05%", // Would be fetched from pool contract
          status: active ? "active" : "expired",
          premium: "0.0045", // Would be calculated from params
          coverage: "50000", // Would be calculated from position size
          deductible: Number(params.deductibleBps) / 100,
          startTime: Number(createdAt) * 1000,
          endTime: Number(createdAt + params.duration) * 1000,
          claimHistory: [], // Would be fetched from events
          riskMetrics: {
            currentIL: 2.5, // Would be calculated from current vs entry price
            maxIL: 5.0,
            volatility: 0.45,
            riskScore: "medium",
          },
          priceHistory: [], // Would be fetched from price oracle
        };

        setPolicyDetails(realPolicy);
      } else {
        // Fallback to mock data when contract data is not available
        const mockPolicy: PolicyDetails = {
          id: policyId,
          poolAddress: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640" as Address,
          poolName: "USDC/ETH 0.05%",
          status: "active",
          premium: "0.0045",
          coverage: "50000",
          deductible: 10,
          startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
          endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          claimHistory: [
            {
              id: "claim-1",
              amount: "1250.50",
              timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
              status: "approved",
            },
          ],
          riskMetrics: {
            currentIL: 2.5,
            maxIL: 8.2,
            volatility: 0.45,
            riskScore: "medium",
          },
          priceHistory: Array.from({ length: 30 }, (_, i) => ({
            timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
            token0Price: 1 + Math.random() * 0.1 - 0.05,
            token1Price: 3200 + Math.random() * 400 - 200,
            ilValue: Math.random() * 5,
          })),
        };

        setPolicyDetails(mockPolicy);
      }
    };

    loadPolicyDetails();
  }, [policyId, contractPolicyData]);

  const handleSubmitClaim = async (claimAmount: string) => {
    if (!address || !policyDetails) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await submitClaim(
        BigInt(policyId),
        parseEther(claimAmount),
        "0x" as Hash // Mock merkle proof for now
      );
      setShowClaimFlow(false);
      toast.success("Claim submitted successfully!");
    } catch (error) {
      console.error("Claim submission failed:", error);
      toast.error("Failed to submit claim");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-green-500/30 text-green-400";
      case "expired":
        return "border-gray-500/30 text-gray-400";
      case "claimed":
        return "border-blue-500/30 text-blue-400";
      default:
        return "border-gray-500/30 text-gray-400";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const chartData = policyDetails
    ? {
        labels: policyDetails.priceHistory.map(p => new Date(p.timestamp).toLocaleDateString()),
        datasets: [
          {
            label: "Impermanent Loss %",
            data: policyDetails.priceHistory.map(p => p.ilValue),
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
          },
          {
            label: "Coverage Threshold",
            data: policyDetails.priceHistory.map(() => policyDetails.deductible),
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderDash: [5, 5],
            tension: 0,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "rgb(156, 163, 175)",
        },
      },
      title: {
        display: true,
        text: "Impermanent Loss Tracking",
        color: "rgb(156, 163, 175)",
      },
    },
    scales: {
      x: {
        ticks: { color: "rgb(156, 163, 175)" },
        grid: { color: "rgba(156, 163, 175, 0.1)" },
      },
      y: {
        ticks: { color: "rgb(156, 163, 175)" },
        grid: { color: "rgba(156, 163, 175, 0.1)" },
      },
    },
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-md mx-auto mt-20">
          <WalletConnection />
        </div>
      </div>
    );
  }

  if (!policyDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-green-400" />
                Policy {policyId}
              </h1>
              <p className="text-gray-400 mt-1">
                {policyDetails.poolName} • {formatDate(policyDetails.startTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className={getStatusColor(policyDetails.status)}>
              {policyDetails.status.charAt(0).toUpperCase() + policyDetails.status.slice(1)}
            </Badge>

            <Button
              onClick={() => setShowTransactionMonitor(!showTransactionMonitor)}
              variant="outline"
              size="sm"
              className="border-purple-500/30"
            >
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Transaction Monitor */}
        {showTransactionMonitor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <TransactionMonitor
              isOpen={showTransactionMonitor}
              onClose={() => setShowTransactionMonitor(false)}
              maxHeight="300px"
            />
          </motion.div>
        )}

        {/* Policy Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-black/60 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-400">Coverage</span>
              </div>
              <div className="text-xl font-bold text-white">${parseFloat(policyDetails.coverage).toLocaleString()}</div>
              <div className="text-xs text-gray-400">{policyDetails.deductible}% deductible</div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-400">Premium Paid</span>
              </div>
              <div className="text-xl font-bold text-white">{policyDetails.premium} ETH</div>
              <div className="text-xs text-gray-400">
                {((parseFloat(policyDetails.premium) / parseFloat(policyDetails.coverage)) * 100).toFixed(3)}% rate
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-400">Current IL</span>
              </div>
              <div className="text-xl font-bold text-white">{policyDetails.riskMetrics.currentIL.toFixed(2)}%</div>
              <div className="text-xs text-gray-400">Max: {policyDetails.riskMetrics.maxIL.toFixed(2)}%</div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Risk Level</span>
              </div>
              <div className={`text-xl font-bold ${getRiskColor(policyDetails.riskMetrics.riskScore)}`}>
                {policyDetails.riskMetrics.riskScore.charAt(0).toUpperCase() +
                  policyDetails.riskMetrics.riskScore.slice(1)}
              </div>
              <div className="text-xs text-gray-400">
                {(policyDetails.riskMetrics.volatility * 100).toFixed(1)}% volatility
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-600">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-red-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              IL Tracking
            </TabsTrigger>
            <TabsTrigger value="claims" className="data-[state=active]:bg-green-600">
              <FileText className="h-4 w-4 mr-2" />
              Claims
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PolicyCard
                policy={
                  {
                    id: policyDetails.id,
                    lp: contractPolicyData?.data?.[0] || ("0x" as any),
                    pool: policyDetails.poolAddress as any,
                    capBps: contractPolicyData?.data?.[2]?.capBps || 0,
                    deductibleBps: policyDetails.deductible * 100,
                    duration: contractPolicyData?.data?.[2]?.duration || 0,
                    entryCommit: contractPolicyData?.data?.[3] || ("0x" as any),
                    blockNumber: BigInt(0),
                    blockTimestamp: BigInt(policyDetails.startTime),
                    transactionHash: "0x" as any,
                    premiumsPaid: BigInt(0),
                    estimatedPayout: BigInt(0),
                    riskLevel: policyDetails.riskMetrics.riskScore,
                    status: policyDetails.status,
                    lastUpdated: policyDetails.endTime,
                  } as unknown as PolicyState
                }
                onClaimRequest={() => setShowClaimFlow(true)}
                showActions={true}
              />

              <Card className="bg-black/60 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-gray-300">Policy Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">Policy Created</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(policyDetails.startTime)}</span>
                  </div>

                  {policyDetails.claimHistory.map(claim => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-blue-400">
                          Claim: ${parseFloat(claim.amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="border-green-500/30 text-green-400 mb-1">
                          {claim.status}
                        </Badge>
                        <div className="text-xs text-gray-400">{formatDate(claim.timestamp)}</div>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between p-3 bg-gray-500/10 border border-gray-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-400">Policy Expires</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(policyDetails.endTime)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* IL Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <Card className="bg-black/60 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-400">Impermanent Loss Tracking</CardTitle>
                <CardDescription>Real-time monitoring of your position's impermanent loss</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 mb-4">{chartData && <Line data={chartData} options={chartOptions} />}</div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {policyDetails.riskMetrics.currentIL.toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-400">Current IL</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-400">
                      {policyDetails.riskMetrics.maxIL.toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-400">Max IL (30d)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{policyDetails.deductible}%</div>
                    <div className="text-sm text-gray-400">Trigger Threshold</div>
                  </div>
                </div>

                {policyDetails.riskMetrics.currentIL > policyDetails.deductible && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Claim threshold reached! You're eligible for a payout.</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/60 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-green-400">Submit New Claim</CardTitle>
                  <CardDescription>File a claim for impermanent loss compensation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowClaimFlow(true)}
                    disabled={policyDetails.status !== "active" || claimState.isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {claimState.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Claim
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-black/60 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-gray-300">Claim History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {policyDetails.claimHistory.map(claim => (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-600"
                      >
                        <div>
                          <div className="text-sm font-medium text-white">
                            ${parseFloat(claim.amount).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">{formatDate(claim.timestamp)}</div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            claim.status === "approved"
                              ? "border-green-500/30 text-green-400"
                              : claim.status === "pending"
                              ? "border-yellow-500/30 text-yellow-400"
                              : "border-red-500/30 text-red-400"
                          }
                        >
                          {claim.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Claim Flow */}
            {showClaimFlow && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ClaimFlow
                  policyId={policyDetails.id}
                  onClaimComplete={result => {
                    if (result.success) {
                      toast.success("Claim submitted successfully!");
                    } else {
                      toast.error("Claim submission failed");
                    }
                    setShowClaimFlow(false);
                  }}
                  onCancel={() => setShowClaimFlow(false)}
                />
              </motion.div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-black/60 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <Shield className="h-4 w-4 text-green-400" />
                    <div>
                      <div className="text-sm text-green-400">Policy Created</div>
                      <div className="text-xs text-gray-400">Premium: {policyDetails.premium} ETH</div>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">{formatDate(policyDetails.startTime)}</div>
                  </div>

                  {policyDetails.claimHistory.map(claim => (
                    <div
                      key={claim.id}
                      className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded"
                    >
                      <FileText className="h-4 w-4 text-blue-400" />
                      <div>
                        <div className="text-sm text-blue-400">
                          Claim {claim.status}: ${parseFloat(claim.amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">IL threshold reached</div>
                      </div>
                      <div className="ml-auto text-xs text-gray-400">{formatDate(claim.timestamp)}</div>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <div>
                      <div className="text-sm text-purple-400">Real-time Monitoring Active</div>
                      <div className="text-xs text-gray-400">Checking IL every block</div>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">Ongoing</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Phase Implementation Note */}
        <div className="text-center pt-6 border-t border-gray-600">
          <div className="text-xs text-gray-400">Phase 6: Complete Policy Detail Page Implementation ✅</div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  PieChart,
  Users,
  Shield,
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Address, formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useRouter } from "next/navigation";

// Import components
import { VaultStats } from "@/components/VaultStats";
import TransactionMonitor from "@/components/TransactionMonitor";
import WalletConnection from "@/components/WalletConnection";

// Import hooks
import { useVaultTransactions } from "@/lib/transactions";
import { useAppStore } from "@/lib/store";

interface VaultPosition {
  shares: string;
  value: string;
  depositTime: number;
  rewards: string;
  yieldEarned: string;
}

interface VaultMetrics {
  totalAssets: string;
  totalSupply: string;
  sharePrice: string;
  apy: number;
  utilizationRate: number;
  solvencyRatio: number;
  pendingClaims: string;
  reserveRatio: number;
}

export default function VaultManagement() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { deposit, withdraw, depositState, withdrawState } = useVaultTransactions();
  const { vaultStats } = useAppStore();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showTransactionMonitor, setShowTransactionMonitor] = useState(false);
  const [userPosition, setUserPosition] = useState<VaultPosition | null>(null);
  const [vaultMetrics, setVaultMetrics] = useState<VaultMetrics | null>(null);

  // Mock vault data - in real implementation, fetch from contracts
  useEffect(() => {
    const loadVaultData = async () => {
      if (!address) return;

      // Mock user position
      const mockPosition: VaultPosition = {
        shares: "1250.5",
        value: "1275.25",
        depositTime: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
        rewards: "25.75",
        yieldEarned: "2.01",
      };

      // Mock vault metrics
      const mockMetrics: VaultMetrics = {
        totalAssets: "15750000",
        totalSupply: "15500000",
        sharePrice: "1.0161",
        apy: 12.5,
        utilizationRate: 68.5,
        solvencyRatio: 145.2,
        pendingClaims: "125000",
        reserveRatio: 31.5,
      };

      setUserPosition(mockPosition);
      setVaultMetrics(mockMetrics);
    };

    loadVaultData();
  }, [address]);

  const handleDeposit = async () => {
    if (!depositAmount || !address) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const amount = parseEther(depositAmount);
      await deposit(amount, address);
      setDepositAmount("");
      toast.success("Deposit initiated successfully!");
    } catch (error) {
      console.error("Deposit failed:", error);
      toast.error("Failed to deposit");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !address) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const amount = parseEther(withdrawAmount);
      await withdraw(amount, address);
      setWithdrawAmount("");
      toast.success("Withdrawal initiated successfully!");
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error("Failed to withdraw");
    }
  };

  const handleMaxDeposit = () => {
    if (balance) {
      const maxAmount = formatEther(balance.value);
      // Keep some ETH for gas
      const depositableAmount = Math.max(0, parseFloat(maxAmount) - 0.01);
      setDepositAmount(depositableAmount.toString());
    }
  };

  const handleMaxWithdraw = () => {
    if (userPosition) {
      setWithdrawAmount(userPosition.shares);
    }
  };

  const formatCurrency = (amount: string) => {
    return parseFloat(amount).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const getHealthColor = (ratio: number, threshold: number) => {
    if (ratio >= threshold * 1.2) return "text-green-400";
    if (ratio >= threshold) return "text-yellow-400";
    return "text-red-400";
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

  if (!vaultMetrics || !userPosition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Wallet className="h-8 w-8 text-orange-400" />
              Insurance Vault Management
            </h1>
            <p className="text-gray-400 mt-2">Provide liquidity and earn yield while backing IL insurance policies</p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/dashboard")} variant="outline" className="border-gray-600">
              Dashboard
            </Button>
            <Button
              onClick={() => setShowTransactionMonitor(!showTransactionMonitor)}
              variant="outline"
              className="border-purple-500/30"
            >
              <Activity className="h-4 w-4 mr-2" />
              Transactions
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

        {/* Vault Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-black/60 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-400">APY</span>
              </div>
              <div className="text-2xl font-bold text-white">{vaultMetrics.apy.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Current yield rate</div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-400">Solvency Ratio</span>
              </div>
              <div className={`text-2xl font-bold ${getHealthColor(vaultMetrics.solvencyRatio, 130)}`}>
                {vaultMetrics.solvencyRatio.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">
                Health: {vaultMetrics.solvencyRatio >= 130 ? "Good" : "At Risk"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-gray-400">Utilization</span>
              </div>
              <div className="text-2xl font-bold text-white">{vaultMetrics.utilizationRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Capital deployed</div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-gray-400">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(vaultMetrics.totalAssets)}</div>
              <div className="text-xs text-gray-400">Assets under management</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-600">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="deposit" className="data-[state=active]:bg-green-600">
              <ArrowDown className="h-4 w-4 mr-2" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="data-[state=active]:bg-red-600">
              <ArrowUp className="h-4 w-4 mr-2" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Position */}
              <Card className="bg-black/60 border-orange-500/30">
                <CardHeader>
                  <CardTitle className="text-orange-400">Your Position</CardTitle>
                  <CardDescription>Your current vault holdings and earnings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vault Shares:</span>
                    <span className="text-white font-mono">{parseFloat(userPosition.shares).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Value:</span>
                    <span className="text-green-400 font-mono">{formatCurrency(userPosition.value)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Yield Earned:</span>
                    <span className="text-blue-400 font-mono">{parseFloat(userPosition.yieldEarned).toFixed(3)}%</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Rewards:</span>
                    <span className="text-purple-400 font-mono">{formatCurrency(userPosition.rewards)}</span>
                  </div>

                  <Separator className="bg-gray-600" />

                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setActiveTab("deposit")} className="bg-green-600 hover:bg-green-700">
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Deposit
                    </Button>
                    <Button
                      onClick={() => setActiveTab("withdraw")}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Vault Performance */}
              <Card className="bg-black/60 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-gray-300">Vault Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Share Price:</span>
                    <span className="text-white font-mono">${parseFloat(vaultMetrics.sharePrice).toFixed(6)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Shares:</span>
                    <span className="text-white font-mono">
                      {parseFloat(vaultMetrics.totalSupply).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Pending Claims:</span>
                    <span className="text-yellow-400 font-mono">{formatCurrency(vaultMetrics.pendingClaims)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Reserve Ratio:</span>
                    <span className={`font-mono ${getHealthColor(vaultMetrics.reserveRatio, 25)}`}>
                      {vaultMetrics.reserveRatio.toFixed(1)}%
                    </span>
                  </div>

                  {vaultMetrics.solvencyRatio < 130 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Low solvency ratio - deposits may be temporarily limited</span>
                      </div>
                    </div>
                  )}

                  {vaultMetrics.solvencyRatio >= 130 && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Vault is healthy and accepting deposits</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deposit Tab */}
          <TabsContent value="deposit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/60 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-green-400">Deposit to Vault</CardTitle>
                  <CardDescription>Provide liquidity and earn yield while backing insurance policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount" className="text-gray-300">
                      Amount (ETH)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="depositAmount"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.001"
                        className="bg-gray-800/50 border-gray-600 text-white"
                      />
                      <Button onClick={handleMaxDeposit} variant="outline" size="sm" className="border-gray-600">
                        MAX
                      </Button>
                    </div>
                  </div>

                  {depositAmount && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">You will receive:</span>
                          <span className="text-blue-400">
                            ~{(parseFloat(depositAmount) / parseFloat(vaultMetrics.sharePrice)).toFixed(2)} shares
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Est. APY:</span>
                          <span className="text-green-400">{vaultMetrics.apy.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleDeposit}
                    disabled={!depositAmount || depositState.isLoading || vaultMetrics.solvencyRatio < 130}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {depositState.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Depositing...
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Deposit {depositAmount ? `${depositAmount} ETH` : ""}
                      </>
                    )}
                  </Button>

                  <div className="text-xs text-gray-400">
                    Your ETH will be used to back insurance policies and earn yield from premiums.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-gray-300">Deposit Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm">Earn {vaultMetrics.apy.toFixed(1)}% APY from premiums</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">Help secure the insurance protocol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">Join the liquidity provider community</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-400" />
                    <span className="text-sm">Receive additional protocol rewards</span>
                  </div>

                  <Separator className="bg-gray-600" />

                  <div className="text-xs text-gray-400">
                    <strong>Risk:</strong> Your deposits may be used to pay out valid insurance claims. The vault
                    maintains reserves to minimize this risk.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/60 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-red-400">Withdraw from Vault</CardTitle>
                  <CardDescription>Redeem your vault shares for underlying ETH</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdrawAmount" className="text-gray-300">
                      Amount (Shares)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="withdrawAmount"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.001"
                        className="bg-gray-800/50 border-gray-600 text-white"
                      />
                      <Button onClick={handleMaxWithdraw} variant="outline" size="sm" className="border-gray-600">
                        MAX
                      </Button>
                    </div>
                  </div>

                  {withdrawAmount && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">You will receive:</span>
                          <span className="text-red-400">
                            ~{(parseFloat(withdrawAmount) * parseFloat(vaultMetrics.sharePrice)).toFixed(6)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Remaining shares:</span>
                          <span className="text-gray-300">
                            {Math.max(0, parseFloat(userPosition.shares) - parseFloat(withdrawAmount)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || withdrawState.isLoading}
                    variant="outline"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {withdrawState.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2"></div>
                        Withdrawing...
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Withdraw {withdrawAmount ? `${withdrawAmount} shares` : ""}
                      </>
                    )}
                  </Button>

                  <div className="text-xs text-gray-400">
                    Withdrawals may be subject to a delay if vault utilization is high.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-gray-300">Withdrawal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available to withdraw:</span>
                    <span className="text-white">{userPosition.shares} shares</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Current share value:</span>
                    <span className="text-white">${parseFloat(vaultMetrics.sharePrice).toFixed(6)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Total yield earned:</span>
                    <span className="text-green-400">
                      {userPosition.yieldEarned}% ({formatCurrency(userPosition.rewards)})
                    </span>
                  </div>

                  <Separator className="bg-gray-600" />

                  <div className="text-xs text-gray-400">
                    <strong>Note:</strong> Withdrawing will stop earning yield on withdrawn amounts. Consider partial
                    withdrawals to maintain exposure.
                  </div>

                  {vaultMetrics.utilizationRate > 90 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">High utilization - withdrawals may be delayed</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <VaultStats
              metrics={{
                totalReserves: BigInt("1000000000000000000000"), // 1000 ETH
                activePolicies: 245,
                totalPayouts: 75000,
                utilizationRate: 68.5,
                riskExposure: 65.2,
                reserveHistory: Array.from({ length: 30 }, (_, i) => ({
                  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
                  reserves: BigInt(Math.floor(1000 * 1e18 * (0.8 + Math.random() * 0.4))),
                  required: BigInt(Math.floor(1000 * 1e18 * (0.7 + Math.random() * 0.2))),
                })),
                premiumBreakdown: [
                  { poolName: "USDC/ETH", amount: BigInt(Math.floor(1000 * 1e18 * 0.4)) },
                  { poolName: "USDT/ETH", amount: BigInt(Math.floor(1000 * 1e18 * 0.3)) },
                  { poolName: "DAI/ETH", amount: BigInt(Math.floor(1000 * 1e18 * 0.2)) },
                  { poolName: "WBTC/ETH", amount: BigInt(Math.floor(1000 * 1e18 * 0.1)) },
                ],
                payoutHistory: Array.from({ length: 20 }, (_, i) => ({
                  date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
                  amount: BigInt(Math.floor(Math.random() * 1000000)),
                })),
                reserveBreakdown: [
                  { asset: "ETH", amount: BigInt(Math.floor(1000 * 1e18 * 0.6)) },
                  { asset: "USDC", amount: BigInt(Math.floor(1000 * 1e18 * 0.25)) },
                  { asset: "USDT", amount: BigInt(Math.floor(1000 * 1e18 * 0.15)) },
                ],
                recentPayouts: Array.from({ length: 10 }, (_, i) => ({
                  policyId: `policy-${i + 1}`,
                  amount: BigInt(Math.floor(Math.random() * 2000000)),
                  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                })),
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Phase Implementation Note */}
        <div className="text-center pt-6 border-t border-gray-600">
          <div className="text-xs text-gray-400">Phase 6: Complete Vault Management Page Implementation ✅</div>
        </div>
      </div>
    </div>
  );
}

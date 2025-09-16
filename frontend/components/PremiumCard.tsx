import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface PolicyParams {
  deductibleBps: number;
  capBps: number;
  duration: number;
}

interface PremiumCardProps {
  poolAddress?: string;
  poolName?: string;
  currentPrice?: {
    token0: number;
    token1: number;
  };
  poolVolatility?: number;
  onCreatePolicy?: (params: PolicyParams & { amount0: string; amount1: string }) => void;
  onQuoteUpdate?: (quote: PremiumQuote) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

interface PremiumQuote {
  premiumAmount: number;
  maxPayout: number;
  effectiveRate: number;
  riskLevel: "low" | "medium" | "high";
  gasCost: number;
}

export default function PremiumCard({
  poolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640", // USDC/ETH
  poolName = "USDC/ETH 0.05%",
  currentPrice = { token0: 1, token1: 3200 },
  poolVolatility = 0.45,
  onCreatePolicy,
  onQuoteUpdate,
  isLoading = false,
  disabled = false,
}: PremiumCardProps) {
  // State management
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [customParams, setCustomParams] = useState<PolicyParams>({
    deductibleBps: 1000, // 10%
    capBps: 5000, // 50%
    duration: 100000, // ~2 weeks
  });
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);
  const [quote, setQuote] = useState<PremiumQuote | null>(null);
  const [balanceWarning, setBalanceWarning] = useState<string>("");

  // Calculate premium quote
  const calculateQuote = useCallback(async () => {
    if (!amount0 || !amount1 || !insuranceEnabled) {
      setQuote(null);
      return;
    }

    setIsCalculatingQuote(true);

    try {
      const totalValue = parseFloat(amount0) * currentPrice.token0 + parseFloat(amount1) * currentPrice.token1;

      // Risk-based premium calculation
      const baseRate = 0.0003; // 0.03% base rate
      const volatilityMultiplier = 1 + (poolVolatility - 0.3) * 2; // Higher volatility = higher premium
      const durationMultiplier = Math.sqrt(customParams.duration / 100000); // Longer duration = higher premium

      const effectiveRate = baseRate * volatilityMultiplier * durationMultiplier;
      const premiumAmount = totalValue * effectiveRate;

      // Calculate max payout based on cap
      const maxPayout = (totalValue * customParams.capBps) / 10000;

      // Determine risk level
      const riskLevel: "low" | "medium" | "high" =
        effectiveRate < 0.0005 ? "low" : effectiveRate < 0.001 ? "medium" : "high";

      // Estimate gas cost
      const gasCost = 0.005; // Mock gas cost

      const newQuote: PremiumQuote = {
        premiumAmount,
        maxPayout,
        effectiveRate,
        riskLevel,
        gasCost,
      };

      setQuote(newQuote);
      onQuoteUpdate?.(newQuote);
    } catch (error) {
      console.error("Quote calculation failed:", error);
      toast.error("Failed to calculate premium quote");
    } finally {
      setIsCalculatingQuote(false);
    }
  }, [amount0, amount1, insuranceEnabled, currentPrice, poolVolatility, customParams, onQuoteUpdate]);

  // Auto-calculate quote when inputs change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateQuote();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [calculateQuote]);

  // Memoized calculations
  const totalLiquidityValue = useMemo(() => {
    if (!amount0 || !amount1) return 0;
    return parseFloat(amount0) * currentPrice.token0 + parseFloat(amount1) * currentPrice.token1;
  }, [amount0, amount1, currentPrice]);

  const impermanentLossEstimate = useMemo(() => {
    // Simple IL estimation based on historical volatility
    const priceChange = poolVolatility * 0.5; // Assume 50% of volatility as potential price change
    return (totalLiquidityValue * (priceChange * priceChange)) / 4; // Simplified IL formula
  }, [totalLiquidityValue, poolVolatility]);

  // Handle policy creation
  const handleCreatePolicy = async () => {
    if (!insuranceEnabled || !quote || !onCreatePolicy) {
      toast.error("Please enable insurance and ensure all fields are filled");
      return;
    }

    if (balanceWarning) {
      toast.error(balanceWarning);
      return;
    }

    try {
      await onCreatePolicy({
        ...customParams,
        amount0,
        amount1,
      });

      toast.success("Policy creation initiated successfully!");

      // Reset form
      setAmount0("");
      setAmount1("");
      setInsuranceEnabled(false);
      setQuote(null);
    } catch (error) {
      console.error("Policy creation failed:", error);
      toast.error("Failed to create policy");
    }
  };

  const getRiskColor = (riskLevel: string) =>
    ({
      low: "text-green-400 border-green-500/30",
      medium: "text-yellow-400 border-yellow-500/30",
      high: "text-red-400 border-red-500/30",
    }[riskLevel] || "text-gray-400");

  return (
    <TooltipProvider>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="w-full max-w-md bg-black/60 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  IL Insurance
                </CardTitle>
                <CardDescription className="text-gray-300">Protect your {poolName} position</CardDescription>
              </div>
              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                {(poolVolatility * 100).toFixed(1)}% volatility
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Liquidity Amounts */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-1">
                <Calculator className="h-4 w-4" />
                Liquidity Position
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount0" className="text-gray-300">
                    USDC Amount
                  </Label>
                  <Input
                    id="amount0"
                    value={amount0}
                    onChange={e => setAmount0(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    className="bg-gray-800/50 border-gray-600 text-white"
                    disabled={disabled || isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount1" className="text-gray-300">
                    ETH Amount
                  </Label>
                  <Input
                    id="amount1"
                    value={amount1}
                    onChange={e => setAmount1(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="0.001"
                    className="bg-gray-800/50 border-gray-600 text-white"
                    disabled={disabled || isLoading}
                  />
                </div>
              </div>

              {totalLiquidityValue > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Value:</span>
                    <span className="text-blue-400 font-mono">${totalLiquidityValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Est. IL Risk:</span>
                    <span className="text-yellow-400 font-mono">${impermanentLossEstimate.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-gray-600" />

            {/* Insurance Toggle */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insurance"
                  checked={insuranceEnabled}
                  onCheckedChange={checked => setInsuranceEnabled(checked as boolean)}
                  disabled={disabled || isLoading}
                />
                <Label htmlFor="insurance" className="text-gray-300 flex items-center gap-2">
                  Enable IL Insurance
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Protect against impermanent loss with automated payouts</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>

              <AnimatePresence>
                {insuranceEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Policy Parameters */}
                    <div className="space-y-4 p-4 bg-gray-800/30 rounded border border-gray-600">
                      <h5 className="text-sm font-medium text-gray-200">Policy Configuration</h5>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-gray-400">Deductible</Label>
                            <span className="text-white text-sm">{(customParams.deductibleBps / 100).toFixed(1)}%</span>
                          </div>
                          <Input
                            type="range"
                            min={500}
                            max={2000}
                            step={100}
                            value={customParams.deductibleBps}
                            onChange={e =>
                              setCustomParams(prev => ({ ...prev, deductibleBps: parseInt(e.target.value) }))
                            }
                            className="w-full"
                            disabled={disabled || isLoading}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-gray-400">Coverage Cap</Label>
                            <span className="text-white text-sm">{(customParams.capBps / 100).toFixed(1)}%</span>
                          </div>
                          <Input
                            type="range"
                            min={2000}
                            max={8000}
                            step={500}
                            value={customParams.capBps}
                            onChange={e => setCustomParams(prev => ({ ...prev, capBps: parseInt(e.target.value) }))}
                            className="w-full"
                            disabled={disabled || isLoading}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-gray-400">Duration</Label>
                            <span className="text-white text-sm">~{Math.round(customParams.duration / 7200)} days</span>
                          </div>
                          <Input
                            type="range"
                            min={50000}
                            max={200000}
                            step={10000}
                            value={customParams.duration}
                            onChange={e => setCustomParams(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                            className="w-full"
                            disabled={disabled || isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Premium Quote */}
                    <AnimatePresence>
                      {(quote || isCalculatingQuote) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-4 bg-green-500/10 border border-green-500/30 rounded"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="h-4 w-4 text-green-400" />
                            <span className="font-medium text-green-400">Premium Quote</span>
                            {isCalculatingQuote && (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
                            )}
                          </div>

                          {quote && !isCalculatingQuote && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Premium:</span>
                                <span className="text-green-400 font-mono">{quote.premiumAmount.toFixed(6)} ETH</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Max Payout:</span>
                                <span className="text-green-400 font-mono">{quote.maxPayout.toFixed(6)} ETH</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Rate:</span>
                                <span className="text-white">{(quote.effectiveRate * 100).toFixed(4)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Risk Level:</span>
                                <Badge variant="outline" className={getRiskColor(quote.riskLevel)}>
                                  {quote.riskLevel}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Est. Gas:</span>
                                <span className="text-gray-300 font-mono">{quote.gasCost.toFixed(6)} ETH</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Warnings */}
                    {balanceWarning && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-red-400">{balanceWarning}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleCreatePolicy}
              disabled={
                disabled ||
                isLoading ||
                !insuranceEnabled ||
                !quote ||
                isCalculatingQuote ||
                !!balanceWarning ||
                !amount0 ||
                !amount1
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Policy...
                </>
              ) : !insuranceEnabled ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Enable Insurance
                </>
              ) : !quote ? (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Enter Amounts
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create Insured Position
                </>
              )}
            </Button>

            {/* Phase Implementation Note */}
            <div className="pt-2 border-t border-gray-600">
              <div className="text-xs text-gray-400 text-center">
                Phase 6: Dynamic Premium Calculation & Real-time Quotes ✅
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

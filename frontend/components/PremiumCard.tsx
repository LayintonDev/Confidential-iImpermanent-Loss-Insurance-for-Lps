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
  Cpu,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useFhenixApi, PremiumCalculationResponse, RiskAssessmentResponse } from "@/lib/fhenix-api";

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
  error?: string | null;
  success?: boolean;
  // Token information for dynamic labels
  token0?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  token1?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface PremiumQuote {
  premiumAmount: number;
  maxPayout: number;
  effectiveRate: number;
  riskLevel: "low" | "medium" | "high";
  gasCost: number;
  // Fhenix-powered data
  confidentialCalculation?: {
    basePremium: bigint;
    adjustedPremium: bigint;
    premiumBps: number;
    breakdown: {
      riskComponent: bigint;
      poolComponent: bigint;
      timeComponent: bigint;
      confidentialityBonus: bigint;
    };
  };
  riskAssessment?: {
    riskScore: number;
    confidence: number;
    riskLevel: "low" | "medium" | "high";
    riskFactors: string[];
    factors: {
      volatility: number;
      liquidity: number;
      historicalLoss: number;
      poolAge: number;
    };
    recommendations: string[];
  };
  isConfidential: boolean;
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
  error = null,
  success = false,
  // Default token information for fallback
  token0 = { name: "USD Coin", symbol: "USDC", decimals: 6 },
  token1 = { name: "Ethereum", symbol: "ETH", decimals: 18 },
}: PremiumCardProps) {
  // Hooks
  const { address } = useAccount();
  const fhenixApi = useFhenixApi();

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

  // Fhenix integration state
  const [useConfidentialCalculation, setUseConfidentialCalculation] = useState(true);
  const [fhenixError, setFhenixError] = useState<string | null>(null);
  const [fhenixServiceHealth, setFhenixServiceHealth] = useState<"unknown" | "healthy" | "unhealthy">("unknown");

  // Health check for Fhenix service
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await fhenixApi.healthCheck();
        setFhenixServiceHealth(health.status);
        if (health.status === "unhealthy") {
          console.warn("Fhenix service is unhealthy:", health.message);
          setUseConfidentialCalculation(false);
        }
      } catch (error) {
        console.error("Fhenix health check failed:", error);
        setFhenixServiceHealth("unhealthy");
        setUseConfidentialCalculation(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [fhenixApi]);

  // Calculate premium quote with Fhenix integration
  const calculateQuote = useCallback(async () => {
    if (!amount0 || !amount1 || !insuranceEnabled) {
      setQuote(null);
      return;
    }

    setIsCalculatingQuote(true);
    setFhenixError(null);

    try {
      const totalValue = parseFloat(amount0) * currentPrice.token0 + parseFloat(amount1) * currentPrice.token1;
      const liquidityAmount = BigInt(Math.floor(parseFloat(amount0) * 1e18)); // Convert to wei
      const coverage = BigInt(Math.floor(totalValue * 1e18)); // Convert to wei

      let confidentialCalculation = undefined;
      let riskAssessment = undefined;
      let isConfidential = false;

      // Try Fhenix confidential calculation if enabled and service is healthy
      if (useConfidentialCalculation && fhenixServiceHealth === "healthy" && address) {
        try {
          console.log("🔐 Using Fhenix confidential calculation...");

          // Parallel execution of risk assessment and premium calculation
          const [riskResponse, premiumResponse] = await Promise.all([
            fhenixApi.assessRisk({
              poolAddress: poolAddress as Address,
              token0: "0x0000000000000000000000000000000000000000" as Address, // Mock for now
              token1: "0xA0b86a33E6410c0f35f9A4A5b2d0e93f5c4dD35B" as Address, // Mock for now
              liquidityAmount,
              userAddress: address,
              duration: customParams.duration,
            }),
            fhenixApi.calculatePremium({
              poolAddress: poolAddress as Address,
              coverage,
              duration: customParams.duration,
              userRiskProfile: {
                historicalLosses: 0, // Could be fetched from user history
                portfolioSize: totalValue.toString(),
                experienceLevel: "intermediate", // Could be determined from user behavior
              },
              poolMetrics: {
                volatility: poolVolatility,
                liquidity: BigInt(Math.floor(totalValue * 10 * 1e18)), // Mock pool liquidity
                volume24h: BigInt(Math.floor(totalValue * 5 * 1e18)), // Mock 24h volume
              },
            }),
          ]);

          if (riskResponse.success && riskResponse.data) {
            riskAssessment = {
              ...riskResponse.data,
              confidence: 0.85, // Default confidence score
              riskFactors: riskResponse.data.recommendations.slice(0, 3), // Use recommendations as risk factors
            };
            console.log("✅ Risk assessment completed:", riskAssessment);
          }

          if (premiumResponse.success && premiumResponse.data) {
            confidentialCalculation = {
              basePremium: BigInt(premiumResponse.data.basePremium),
              adjustedPremium: BigInt(premiumResponse.data.adjustedPremium),
              premiumBps: premiumResponse.data.premiumBps,
              breakdown: {
                riskComponent: BigInt(premiumResponse.data.breakdown.riskComponent),
                poolComponent: BigInt(premiumResponse.data.breakdown.poolComponent),
                timeComponent: BigInt(premiumResponse.data.breakdown.timeComponent),
                confidentialityBonus: BigInt(premiumResponse.data.breakdown.confidentialityBonus),
              },
            };
            isConfidential = true;
            console.log("✅ Confidential premium calculation completed:", confidentialCalculation);
          }
        } catch (fhenixError) {
          console.warn("🔄 Fhenix calculation failed, falling back to local calculation:", fhenixError);
          setFhenixError(fhenixError instanceof Error ? fhenixError.message : "Fhenix calculation failed");
          // Continue with fallback calculation
        }
      }

      // Fallback or local calculation
      const baseRate = 0.0003; // 0.03% base rate
      const volatilityMultiplier = 1 + (poolVolatility - 0.3) * 2;
      const durationMultiplier = Math.sqrt(customParams.duration / 100000);

      // Use Fhenix premium if available, otherwise use local calculation
      let effectiveRate: number;
      let premiumAmount: number;

      if (confidentialCalculation) {
        // Use Fhenix confidential calculation
        effectiveRate = confidentialCalculation.premiumBps / 10000;
        premiumAmount = Number(confidentialCalculation.adjustedPremium) / 1e18;
      } else {
        // Use local calculation
        effectiveRate = baseRate * volatilityMultiplier * durationMultiplier;
        premiumAmount = totalValue * effectiveRate;
      }

      // Calculate max payout based on cap
      const maxPayout = (totalValue * customParams.capBps) / 10000;

      // Use Fhenix risk assessment if available
      const riskLevel: "low" | "medium" | "high" = riskAssessment
        ? riskAssessment.riskLevel
        : effectiveRate < 0.0005
        ? "low"
        : effectiveRate < 0.001
        ? "medium"
        : "high";

      const gasCost = 0.005; // Mock gas cost

      const newQuote: PremiumQuote = {
        premiumAmount,
        maxPayout,
        effectiveRate,
        riskLevel,
        gasCost,
        confidentialCalculation,
        riskAssessment,
        isConfidential,
      };

      setQuote(newQuote);
      onQuoteUpdate?.(newQuote);

      // Show success message for confidential calculation
      if (isConfidential) {
        toast.success("🔐 Premium calculated using confidential computation!", {
          duration: 3000,
          icon: "🔐",
        });
      }
    } catch (error) {
      console.error("Quote calculation failed:", error);
      toast.error("Failed to calculate premium quote");
      setFhenixError(error instanceof Error ? error.message : "Quote calculation failed");
    } finally {
      setIsCalculatingQuote(false);
    }
  }, [
    amount0,
    amount1,
    insuranceEnabled,
    currentPrice,
    poolVolatility,
    customParams,
    onQuoteUpdate,
    useConfidentialCalculation,
    fhenixServiceHealth,
    address,
    poolAddress,
    fhenixApi,
  ]);

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
                  {/* Fhenix Status Indicator */}
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        {fhenixServiceHealth === "healthy" && useConfidentialCalculation && (
                          <Cpu className="h-4 w-4 text-blue-400 animate-pulse" />
                        )}
                        {fhenixServiceHealth === "unhealthy" && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        {fhenixServiceHealth === "healthy" && useConfidentialCalculation && (
                          <span className="text-blue-400">🔐 Confidential computation enabled</span>
                        )}
                        {fhenixServiceHealth === "unhealthy" && (
                          <span className="text-yellow-400">⚠️ Using fallback calculation</span>
                        )}
                        {fhenixServiceHealth === "unknown" && (
                          <span className="text-gray-400">⏳ Checking Fhenix service...</span>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Protect your {poolName} position
                  {quote?.isConfidential && (
                    <span className="ml-2 text-blue-400 text-xs">• Confidentially calculated</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  {(poolVolatility * 100).toFixed(1)}% volatility
                </Badge>
                {quote?.isConfidential && (
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                    <Cpu className="h-3 w-3 mr-1" />
                    Fhenix
                  </Badge>
                )}
              </div>
            </div>

            {/* Fhenix Error Alert */}
            {fhenixError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Fhenix service unavailable. Using local calculation.</span>
                </div>
              </motion.div>
            )}

            {/* Fhenix Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">Confidential Calculation</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs max-w-xs">
                      Uses Fhenix confidential computation for enhanced privacy and more accurate risk assessment
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Checkbox
                checked={useConfidentialCalculation}
                onCheckedChange={checked => setUseConfidentialCalculation(checked === true)}
                disabled={fhenixServiceHealth !== "healthy"}
              />
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
                    {token0.symbol} Amount
                  </Label>
                  <Input
                    id="amount0"
                    value={amount0}
                    onChange={e => setAmount0(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step={token0.decimals === 18 ? "0.001" : "0.01"}
                    className="bg-gray-800/50 border-gray-600 text-white"
                    disabled={disabled || isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount1" className="text-gray-300">
                    {token1.symbol} Amount
                  </Label>
                  <Input
                    id="amount1"
                    value={amount1}
                    onChange={e => setAmount1(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step={token1.decimals === 18 ? "0.001" : "0.01"}
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
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      Pool: {token0.symbol}/{token1.symbol}
                    </span>
                    <span>{poolVolatility && (poolVolatility * 100).toFixed(1)}% volatility</span>
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
                            <div className="space-y-3">
                              {/* Basic Quote Info */}
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

                              {/* Fhenix Confidential Data */}
                              {quote.isConfidential && quote.riskAssessment && (
                                <div className="pt-3 border-t border-gray-600">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Cpu className="h-3 w-3 text-blue-400" />
                                    <span className="text-xs font-medium text-blue-400">
                                      Confidential Risk Assessment
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Risk Score:</span>
                                      <span className="text-blue-300">
                                        {quote.riskAssessment.riskScore.toFixed(2)}/10
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Confidence:</span>
                                      <span className="text-blue-300">
                                        {(quote.riskAssessment.confidence * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                    {quote.riskAssessment.riskFactors.length > 0 && (
                                      <div className="mt-2">
                                        <span className="text-gray-400">Risk Factors:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {quote.riskAssessment.riskFactors.slice(0, 2).map((factor, index) => (
                                            <Badge
                                              key={index}
                                              variant="outline"
                                              className="border-blue-500/30 text-blue-300 text-xs py-0 px-1"
                                            >
                                              {factor}
                                            </Badge>
                                          ))}
                                          {quote.riskAssessment.riskFactors.length > 2 && (
                                            <Badge
                                              variant="outline"
                                              className="border-blue-500/30 text-blue-300 text-xs py-0 px-1"
                                            >
                                              +{quote.riskAssessment.riskFactors.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Fhenix Service Status */}
                              {quote.isConfidential && (
                                <div className="flex items-center gap-2 text-xs text-blue-400">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                  <span>Powered by Fhenix confidential computation</span>
                                </div>
                              )}
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
              className={`w-full transition-all duration-200 ${
                success
                  ? "bg-green-600 hover:bg-green-700"
                  : error
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <Clock className="h-4 w-4 mr-2" />
                  Creating Policy...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                  Policy Created Successfully!
                </>
              ) : error ? (
                <>
                  <XCircle className="h-4 w-4 mr-2 text-red-300" />
                  Retry Policy Creation
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
              ) : isCalculatingQuote ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculating Quote...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create Insured Position
                </>
              )}
            </Button>

            {/* Status Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Policy created successfully! Check your policies tab.</span>
                </div>
              </div>
            )}

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

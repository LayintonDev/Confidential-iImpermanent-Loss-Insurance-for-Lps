import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { usePolicyEvents } from "@/lib/events";
import { usePolicyManager, useInsuranceVault, CONTRACT_ADDRESSES, INSURANCE_VAULT_ABI } from "@/lib/contracts";
import { PolicyState } from "@/lib/store";
import { useReadContract } from "wagmi";

interface PolicyCardProps {
  policy: PolicyState;
  onClaimRequest?: (policyId: string) => void;
  onBurnPolicy?: (policyId: string) => void;
  onViewDetails?: (policyId: string) => void;
  isLoading?: boolean;
  compact?: boolean;
  showActions?: boolean;
}

export default function PolicyCard({
  policy,
  onClaimRequest,
  onBurnPolicy,
  onViewDetails,
  isLoading = false,
  compact = false,
  showActions = true,
}: PolicyCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(!compact);

  // Real-time event monitoring
  const policyEvents = usePolicyEvents(BigInt(policy.id));
  const { checkSolvency } = useInsuranceVault();

  // Get solvency data at component level instead of in callback
  const { data: vaultReserves } = useReadContract({
    address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
    abi: INSURANCE_VAULT_ABI,
    functionName: "reserves",
    args: ["0x0000000000000000000000000000000000000000"], // Default pool for now
    query: {
      enabled: !!policy.estimatedPayout,
    },
  });
  const { getPolicyDetails } = usePolicyManager();

  // Format utilities
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatPolicyId = (id: string) => `${id.slice(0, 8)}...${id.slice(-6)}`;

  const formatAmount = (amount: bigint, decimals = 18) => {
    const value = Number(amount) / Math.pow(10, decimals);
    return value < 0.0001 ? "< 0.0001" : value.toFixed(4);
  };

  const formatPercentage = (bps: number) => (bps / 100).toFixed(1) + "%";

  // Calculate time remaining
  const timeRemaining = () => {
    const expiryTime = Number(policy.createdAt) + Number(policy.params.duration) * 12 * 1000; // 12s blocks
    const now = Date.now();

    if (now > expiryTime) return null;
    return formatDistanceToNow(expiryTime, { addSuffix: true });
  };

  // Calculate progress percentage
  const progressPercentage = () => {
    const now = Date.now();
    const start = Number(policy.createdAt);
    const end = start + Number(policy.params.duration) * 12 * 1000;

    if (now >= end) return 100;
    if (now <= start) return 0;

    return ((now - start) / (end - start)) * 100;
  };

  // Risk level calculation
  const getRiskIndicator = () => {
    const colors = {
      low: "text-green-400 border-green-500/30",
      medium: "text-yellow-400 border-yellow-500/30",
      high: "text-red-400 border-red-500/30",
    };

    return (
      <Badge variant="outline" className={colors[policy.riskLevel]}>
        {policy.riskLevel} risk
      </Badge>
    );
  };

  // Status badge with animation
  const getStatusBadge = () => {
    const statusConfig = {
      active: { color: "bg-green-600", icon: Shield, text: "Active" },
      claimed: { color: "bg-blue-600", icon: Clock, text: "Claimed" },
      attested: { color: "bg-purple-600", icon: Activity, text: "Attested" },
      settled: { color: "bg-gray-600", icon: Target, text: "Settled" },
      expired: { color: "bg-orange-600", icon: AlertTriangle, text: "Expired" },
    };

    const config = statusConfig[policy.status];
    const Icon = config.icon;

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Badge className={`${config.color} text-white flex items-center gap-1`}>
          <Icon className="h-3 w-3" />
          {config.text}
        </Badge>
      </motion.div>
    );
  };

  // Refresh policy data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, this would trigger data refetch
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Handle claim request with validation
  const handleClaimRequest = useCallback(async () => {
    if (!policy.estimatedPayout) return;

    try {
      // Check vault solvency using the reserves data we fetched at component level
      const isSolvent =
        vaultReserves && policy.estimatedPayout ? (vaultReserves as bigint) >= policy.estimatedPayout : false;

      if (!isSolvent) {
        alert("Vault is currently insolvent for this payout amount");
        return;
      }

      onClaimRequest?.(policy.id);
    } catch (error) {
      console.error("Claim validation failed:", error);
    }
  }, [policy.id, policy.estimatedPayout, onClaimRequest, vaultReserves]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  if (compact) {
    return (
      <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
        <Card
          className="bg-black/60 border-green-500/30 backdrop-blur-sm cursor-pointer"
          onClick={() => onViewDetails?.(policy.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-green-400 truncate">#{formatPolicyId(policy.id)}</div>
                <div className="text-sm text-gray-400">{formatAddress(policy.pool)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-mono text-green-400">{formatAmount(policy.premiumsPaid)} ETH</div>
                {getStatusBadge()}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
        <Card className="w-full max-w-md bg-black/60 border-green-500/30 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-green-400 flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate cursor-help">Policy #{formatPolicyId(policy.id)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <div className="font-semibold">Full Policy ID:</div>
                        <div className="break-all text-xs">{policy.id}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh policy data</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getRiskIndicator()}
                {getStatusBadge()}
              </div>
            </div>

            <CardDescription className="text-gray-300 flex items-center justify-between gap-2">
              <span className="truncate">IL Insurance for Pool {formatAddress(policy.pool)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://etherscan.io/address/${policy.pool}`, "_blank")}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </CardDescription>

            {/* Progress bar for policy duration */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Time remaining</span>
                <span>{timeRemaining() || "Expired"}</span>
              </div>
              <Progress value={progressPercentage()} className="h-1" />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-xs">Paid</span>
                </div>
                <div className="font-mono text-green-400">{formatAmount(policy.premiumsPaid)} ETH</div>
              </div>

              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400">
                  <Target className="h-3 w-3" />
                  <span className="text-xs">Max Payout</span>
                </div>
                <div className="font-mono text-green-400">
                  {policy.estimatedPayout ? formatAmount(policy.estimatedPayout) : "--"} ETH
                </div>
              </div>

              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400">
                  {policy.riskLevel === "high" ? (
                    <TrendingUp className="h-3 w-3 text-red-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-400" />
                  )}
                  <span className="text-xs">Risk</span>
                </div>
                <div className={`font-mono ${policy.riskLevel === "high" ? "text-red-400" : "text-green-400"}`}>
                  {policy.riskLevel}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <Separator className="bg-gray-600" />

                  {/* Policy Parameters */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-200">Coverage Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Deductible:</span>
                        <span className="text-white">{formatPercentage(Number(policy.params.deductibleBps))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Coverage Cap:</span>
                        <span className="text-white">{formatPercentage(Number(policy.params.capBps))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Timeline
                    </h4>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white">
                          {format(new Date(Number(policy.createdAt)), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Updated:</span>
                        <span className="text-white">{format(new Date(policy.lastUpdated), "MMM dd, HH:mm")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Event History */}
                  {(policyEvents.created || policyEvents.claimRequested) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-200">Recent Activity</h4>
                      <div className="space-y-1 text-xs">
                        {policyEvents.claimSettled && (
                          <div className="flex justify-between text-green-400">
                            <span>Claim Settled</span>
                            <span>{formatAmount(policyEvents.claimSettled.payout)} ETH</span>
                          </div>
                        )}
                        {policyEvents.claimAttested && (
                          <div className="flex justify-between text-purple-400">
                            <span>Claim Attested</span>
                            <span>✓</span>
                          </div>
                        )}
                        {policyEvents.claimRequested && (
                          <div className="flex justify-between text-blue-400">
                            <span>Claim Requested</span>
                            <span>⏳</span>
                          </div>
                        )}
                        {policyEvents.created && (
                          <div className="flex justify-between text-gray-400">
                            <span>Policy Created</span>
                            <span>🛡️</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entry Commitment */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-200">Entry Commitment</h4>
                    <div className="p-2 bg-gray-800/50 rounded border border-gray-600">
                      <code className="text-xs text-gray-400 break-all">{policy.entryCommit}</code>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle Details Button */}
            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full text-gray-400 hover:text-white"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
            )}

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                {(policy.status === "active" || policy.status === "claimed") && (
                  <Button
                    onClick={handleClaimRequest}
                    disabled={isLoading || !policy.active}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : policy.status === "claimed" ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Claim Pending
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Request Claim
                      </>
                    )}
                  </Button>
                )}

                {policy.status === "settled" && (
                  <Button
                    onClick={() => onViewDetails?.(policy.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    View Settlement
                  </Button>
                )}

                <Button
                  onClick={() => onBurnPolicy?.(policy.id)}
                  disabled={isLoading || policy.status === "settled"}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  {policy.status === "settled" ? "Completed" : "Cancel Policy"}
                </Button>
              </div>
            )}

            {/* Updated Phase Implementation Note */}
            <div className="pt-2 border-t border-gray-600">
              <div className="text-xs text-gray-400 text-center">Phase 6: Real-time Policy Management ✅</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

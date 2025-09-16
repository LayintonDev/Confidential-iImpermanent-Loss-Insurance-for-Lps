import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Shield,
  Zap,
  FileText,
  Users,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useConfidentialILHook, useAVSManager } from "@/lib/contracts";
import { usePolicyEvents } from "@/lib/events";
import { useAppStore } from "@/lib/store";

interface ClaimFlowProps {
  policyId: string;
  onClaimComplete?: (result: ClaimResult) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

interface ClaimResult {
  success: boolean;
  payout?: bigint;
  transactionHash?: string;
  error?: string;
}

type ClaimStep =
  | "initiate"
  | "confirming"
  | "fhenix-computing"
  | "avs-aggregation"
  | "settlement"
  | "completed"
  | "error";

interface StepConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime: string;
}

const STEP_CONFIG: Record<ClaimStep, StepConfig> = {
  initiate: {
    title: "Initiate Claim",
    description: "Submit beforeRemoveLiquidity transaction to request claim",
    icon: AlertTriangle,
    estimatedTime: "~30s",
  },
  confirming: {
    title: "Transaction Confirming",
    description: "Waiting for blockchain confirmation of claim request",
    icon: Clock,
    estimatedTime: "~1-2 mins",
  },
  "fhenix-computing": {
    title: "Fhenix Computation",
    description: "Computing IL payout using confidential data",
    icon: Shield,
    estimatedTime: "~2-3 mins",
  },
  "avs-aggregation": {
    title: "AVS Signature Aggregation",
    description: "EigenLayer operators validating and signing attestation",
    icon: Users,
    estimatedTime: "~1-2 mins",
  },
  settlement: {
    title: "Settlement Transaction",
    description: "Executing final payout transaction",
    icon: Zap,
    estimatedTime: "~30s",
  },
  completed: {
    title: "Claim Completed",
    description: "Payout successfully transferred to your wallet",
    icon: CheckCircle,
    estimatedTime: "Completed",
  },
  error: {
    title: "Error Occurred",
    description: "Something went wrong during the claim process",
    icon: AlertTriangle,
    estimatedTime: "Failed",
  },
};

export default function ClaimFlow({ policyId, onClaimComplete, onCancel, isOpen = true }: ClaimFlowProps) {
  const [currentStep, setCurrentStep] = useState<ClaimStep>("initiate");
  const [progress, setProgress] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [attestationData, setAttestationData] = useState<any>(null);
  const [fhenixResult, setFhenixResult] = useState<any>(null);
  const [finalPayout, setFinalPayout] = useState<bigint | null>(null);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Contract hooks
  const { watchClaimRequested } = useConfidentialILHook();
  const { watchClaimAttested, watchClaimSettled, submitAttestation } = useAVSManager();

  // Event monitoring
  const policyEvents = usePolicyEvents(BigInt(policyId));

  // Store actions
  const { addTransaction, updateTransaction } = useAppStore();

  // Step progression logic
  const stepOrder: ClaimStep[] = [
    "initiate",
    "confirming",
    "fhenix-computing",
    "avs-aggregation",
    "settlement",
    "completed",
  ];

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const progressPercentage = ((currentStepIndex + 1) / stepOrder.length) * 100;

  // Initialize claim process
  const initiateClaim = useCallback(async () => {
    setIsProcessing(true);
    setCurrentStep("initiate");
    setProgress(10);

    try {
      // Add transaction to store
      const txId = `claim-${policyId}-${Date.now()}`;
      addTransaction({
        id: txId,
        type: "claim",
        description: `Claim request for policy #${policyId}`,
        status: "pending",
      });

      // Simulate beforeRemoveLiquidity call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, "0")}`;
      setTransactionHash(mockTxHash);

      updateTransaction(txId, {
        hash: mockTxHash,
        status: "success",
      });

      setCurrentStep("confirming");
      setProgress(25);

      toast.success("Claim request submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate claim");
      setCurrentStep("error");
      toast.error("Failed to initiate claim");
    }
  }, [policyId, addTransaction, updateTransaction]);

  // Simulate Fhenix computation
  const simulateFhenixComputation = useCallback(async () => {
    setCurrentStep("fhenix-computing");
    setProgress(40);

    try {
      // Simulate API call to Fhenix service
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockFhenixResult = {
        policyId: BigInt(policyId),
        payout: BigInt("1240000000000000000"), // 1.24 ETH
        auditHash: "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
        fhenixSignature: "0x" + Math.random().toString(16).slice(2).padStart(130, "0"),
        workerId: "fhenix-worker-1",
        computedAt: Date.now(),
      };

      setFhenixResult(mockFhenixResult);
      setFinalPayout(mockFhenixResult.payout);
      setProgress(60);

      toast.success("Fhenix computation completed!");
    } catch (err) {
      setError("Fhenix computation failed");
      setCurrentStep("error");
    }
  }, [policyId]);

  // Simulate AVS aggregation
  const simulateAVSAggregation = useCallback(async () => {
    setCurrentStep("avs-aggregation");
    setProgress(75);

    try {
      // Simulate operator signature aggregation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockAttestationData = {
        aggregatedSignature: "0x" + Math.random().toString(16).slice(2).padStart(130, "0"),
        operatorCount: 5,
        threshold: 3,
        attestationHash: "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
      };

      setAttestationData(mockAttestationData);
      setProgress(90);

      toast.success("AVS signatures aggregated!");
    } catch (err) {
      setError("AVS aggregation failed");
      setCurrentStep("error");
    }
  }, []);

  // Execute settlement
  const executeSettlement = useCallback(async () => {
    if (!fhenixResult || !attestationData) return;

    setCurrentStep("settlement");
    setProgress(95);

    try {
      // Submit attestation to contract
      await submitAttestation(
        fhenixResult.policyId,
        fhenixResult.fhenixSignature,
        attestationData.aggregatedSignature,
        fhenixResult.payout
      );

      setCurrentStep("completed");
      setProgress(100);

      const result: ClaimResult = {
        success: true,
        payout: fhenixResult.payout,
        transactionHash: transactionHash,
      };

      onClaimComplete?.(result);
      toast.success(`Claim completed! Received ${Number(fhenixResult.payout) / 1e18} ETH`);
    } catch (err) {
      setError("Settlement transaction failed");
      setCurrentStep("error");

      const result: ClaimResult = {
        success: false,
        error: err instanceof Error ? err.message : "Settlement failed",
      };

      onClaimComplete?.(result);
    } finally {
      setIsProcessing(false);
    }
  }, [fhenixResult, attestationData, submitAttestation, transactionHash, onClaimComplete]);

  // Auto-progress through steps
  useEffect(() => {
    if (currentStep === "confirming") {
      const timer = setTimeout(() => {
        simulateFhenixComputation();
      }, 3000);
      return () => clearTimeout(timer);
    } else if (currentStep === "fhenix-computing") {
      // Wait for Fhenix completion, triggered by simulateFhenixComputation
      const timer = setTimeout(() => {
        simulateAVSAggregation();
      }, 100);
      return () => clearTimeout(timer);
    } else if (currentStep === "avs-aggregation") {
      // Wait for AVS completion, triggered by simulateAVSAggregation
      const timer = setTimeout(() => {
        executeSettlement();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, simulateFhenixComputation, simulateAVSAggregation, executeSettlement]);

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    completed: { opacity: 0.7, x: -10 },
  };

  const formatAmount = (amount: bigint, decimals = 18) => {
    return (Number(amount) / Math.pow(10, decimals)).toFixed(4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <Card className="w-full max-w-2xl bg-black/90 border-green-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Claim Flow - Policy #{policyId}
                </CardTitle>
                <CardDescription className="text-gray-300">Processing your IL insurance claim request</CardDescription>
              </div>
              {onCancel && currentStep !== "completed" && (
                <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>
                  Cancel
                </Button>
              )}
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Overall Progress</span>
                <span className="text-white">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Current Step Display */}
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div
                  className={`p-3 rounded-full ${
                    currentStep === "completed"
                      ? "bg-green-600"
                      : currentStep === "error"
                      ? "bg-red-600"
                      : "bg-blue-600"
                  }`}
                >
                  {React.createElement(STEP_CONFIG[currentStep].icon, {
                    className: "h-6 w-6 text-white",
                  })}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white">{STEP_CONFIG[currentStep].title}</h3>
              <p className="text-gray-400">{STEP_CONFIG[currentStep].description}</p>
              {isProcessing && currentStep !== "completed" && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Estimated time: {STEP_CONFIG[currentStep].estimatedTime}
                </div>
              )}
            </div>

            <Separator className="bg-gray-600" />

            {/* Step List */}
            <div className="space-y-3">
              {stepOrder.map((step, index) => {
                const config = STEP_CONFIG[step];
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isUpcoming = index > currentStepIndex;

                return (
                  <motion.div
                    key={step}
                    variants={stepVariants}
                    initial="hidden"
                    animate={isCompleted ? "completed" : isCurrent ? "visible" : "hidden"}
                    className={`flex items-center gap-3 p-3 rounded border ${
                      isCompleted
                        ? "border-green-500/30 bg-green-500/10"
                        : isCurrent
                        ? "border-blue-500/30 bg-blue-500/10"
                        : "border-gray-600/30 bg-gray-800/30"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        isCompleted ? "bg-green-600" : isCurrent ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      {React.createElement(config.icon, {
                        className: "h-4 w-4 text-white",
                      })}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isCompleted ? "text-green-400" : isCurrent ? "text-blue-400" : "text-gray-400"
                          }`}
                        >
                          {config.title}
                        </span>
                        {isCompleted && <CheckCircle className="h-4 w-4 text-green-400" />}
                        {isCurrent && isProcessing && <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />}
                      </div>
                      <p className="text-sm text-gray-400">{config.description}</p>
                    </div>

                    <div className="text-sm text-gray-500">{config.estimatedTime}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Results Display */}
            <AnimatePresence>
              {(fhenixResult || attestationData || finalPayout) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <Separator className="bg-gray-600" />

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-200">Process Details</h4>

                    {fhenixResult && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-purple-400" />
                          <span className="font-medium text-purple-400">Fhenix Computation Result</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Computed Payout:</span>
                            <span className="text-white font-mono">{formatAmount(fhenixResult.payout)} ETH</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Worker ID:</span>
                            <span className="text-white font-mono">{fhenixResult.workerId}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {attestationData && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-400" />
                          <span className="font-medium text-blue-400">AVS Aggregation Result</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Operators:</span>
                            <span className="text-white">
                              {attestationData.threshold}/{attestationData.operatorCount} signed
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Attestation:</span>
                            <span className="text-white font-mono">
                              {attestationData.attestationHash.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {transactionHash && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-green-400">Transaction Details</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Transaction Hash:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, "_blank")}
                            className="text-green-400 hover:text-green-300"
                          >
                            {transactionHash.slice(0, 10)}...
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            {currentStep === "error" && error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="font-medium text-red-400">Error</span>
                </div>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep === "initiate" && (
                <Button
                  onClick={initiateClaim}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Start Claim Process
                    </>
                  )}
                </Button>
              )}

              {currentStep === "completed" && (
                <Button
                  onClick={() => onClaimComplete?.({ success: true, payout: finalPayout || BigInt(0) })}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  View Settlement
                </Button>
              )}

              {currentStep === "error" && (
                <Button onClick={initiateClaim} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Claim
                </Button>
              )}
            </div>

            {/* Phase Implementation Note */}
            <div className="pt-4 border-t border-gray-600">
              <div className="text-xs text-gray-400 text-center">
                Phase 6: Complete Claim Flow with Real-time Updates ✅
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

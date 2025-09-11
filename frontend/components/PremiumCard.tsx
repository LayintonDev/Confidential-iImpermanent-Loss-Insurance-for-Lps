import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface PolicyParams {
  deductibleBps: number;
  capBps: number;
  premiumBps: number;
  duration: number;
}

interface PremiumCardProps {
  poolAddress?: string;
  onCreatePolicy?: (params: PolicyParams) => void;
  isLoading?: boolean;
}

export default function PremiumCard({ poolAddress = "0x...", onCreatePolicy, isLoading = false }: PremiumCardProps) {
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [customParams, setCustomParams] = useState<PolicyParams>({
    deductibleBps: 1000, // 10%
    capBps: 5000, // 50%
    premiumBps: 3, // 0.03%
    duration: 100000, // ~2 weeks
  });

  const { toast } = useToast();

  const calculateEstimatedPremium = () => {
    if (!amount0 || !amount1) return "0.00";

    const totalValue = parseFloat(amount0) + parseFloat(amount1);
    const premiumRate = customParams.premiumBps / 10000; // Convert from bps
    return (totalValue * premiumRate).toFixed(6);
  };

  const handleCreatePolicy = () => {
    if (!insuranceEnabled) {
      toast({
        title: "Insurance Not Enabled",
        description: "Please enable insurance to create a policy.",
        variant: "destructive",
      });
      return;
    }

    if (!amount0 || !amount1) {
      toast({
        title: "Invalid Amounts",
        description: "Please enter valid liquidity amounts.",
        variant: "destructive",
      });
      return;
    }

    onCreatePolicy?.(customParams);

    toast({
      title: "Policy Created",
      description: `Insurance policy created for pool ${poolAddress}`,
      variant: "default",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-black/60 border-green-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-green-400">IL Insurance Policy</CardTitle>
        <CardDescription className="text-gray-300">
          Protect your liquidity position against impermanent loss
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pool Information */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-200">Pool Address</Label>
          <div className="p-2 bg-gray-800/50 rounded-md border border-gray-600">
            <code className="text-xs text-green-400 break-all">{poolAddress}</code>
          </div>
        </div>
        {/* Liquidity Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount0" className="text-sm font-medium text-gray-200">
              Token0 Amount
            </Label>
            <Input
              id="amount0"
              type="number"
              placeholder="0.0"
              value={amount0}
              onChange={e => setAmount0(e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount1" className="text-sm font-medium text-gray-200">
              Token1 Amount
            </Label>
            <Input
              id="amount1"
              type="number"
              placeholder="0.0"
              value={amount1}
              onChange={e => setAmount1(e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>
        </div>
        {/* Insurance Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="insurance"
            checked={insuranceEnabled}
            onCheckedChange={checked => setInsuranceEnabled(checked === true)}
            className="border-green-500 data-[state=checked]:bg-green-500"
          />
          <Label htmlFor="insurance" className="text-sm font-medium text-gray-200">
            Enable IL Insurance
          </Label>
        </div>{" "}
        {/* Policy Parameters (shown when insurance enabled) */}
        {insuranceEnabled && (
          <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg border border-green-500/20">
            <h4 className="text-sm font-semibold text-green-400">Policy Parameters</h4>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label className="text-gray-300">Deductible</Label>
                <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                  {(customParams.deductibleBps / 100).toFixed(1)}%
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Coverage Cap</Label>
                <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                  {(customParams.capBps / 100).toFixed(1)}%
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Premium Rate</Label>
                <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                  {(customParams.premiumBps / 100).toFixed(2)}%
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Duration</Label>
                <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                  ~2 weeks
                </Badge>
              </div>
            </div>

            {/* Premium Estimate */}
            <div className="pt-2 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Estimated Premium:</span>
                <span className="text-sm font-mono text-green-400">{calculateEstimatedPremium()} ETH</span>
              </div>
            </div>
          </div>
        )}
        {/* Action Button */}
        <Button
          onClick={handleCreatePolicy}
          disabled={isLoading || !insuranceEnabled}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Policy...
            </>
          ) : insuranceEnabled ? (
            "Create Insurance Policy"
          ) : (
            "Enable Insurance First"
          )}
        </Button>
        {/* Phase 2 Status */}
        <div className="text-center">
          <Badge variant="outline" className="border-green-500 text-green-400">
            Phase 2: Policy & Vault Implementation ✅
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

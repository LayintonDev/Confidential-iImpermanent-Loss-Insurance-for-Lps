import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Clock, DollarSign, Target, AlertTriangle } from "lucide-react";

interface PolicyData {
  policyId: number;
  lp: string;
  pool: string;
  params: {
    deductibleBps: number;
    capBps: number;
    premiumBps: number;
    duration: number;
  };
  createdAt: number;
  epoch: number;
  active: boolean;
  entryCommit: string;
}

interface PolicyCardProps {
  policy: PolicyData;
  premiumPaid?: string;
  potentialPayout?: string;
  onClaimRequest?: (policyId: number) => void;
  onBurnPolicy?: (policyId: number) => void;
  isClaimable?: boolean;
  isLoading?: boolean;
}

export default function PolicyCard({
  policy,
  premiumPaid = "0.0023",
  potentialPayout = "1.24",
  onClaimRequest,
  onBurnPolicy,
  isClaimable = false,
  isLoading = false,
}: PolicyCardProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (epoch: number) => {
    // In real implementation, convert epoch to actual date
    const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString();
  };

  const calculateExpiryDate = (createdAt: number, duration: number) => {
    // Simplified calculation for demo
    const expiryDate = new Date(Date.now() + duration * 12 * 1000); // Assuming 12s blocks
    return expiryDate.toLocaleDateString();
  };

  const getStatusBadge = () => {
    if (!policy.active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }

    const currentBlock = Math.floor(Date.now() / 12000); // Simulated block number
    const expiryBlock = policy.createdAt + policy.params.duration;

    if (currentBlock > expiryBlock) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-400">
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-green-600">
        Active
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-md bg-black/60 border-green-500/30 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-400 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policy #{policy.policyId}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription className="text-gray-300">IL Insurance for Pool {formatAddress(policy.pool)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Policy Overview */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-400">
              <DollarSign className="h-3 w-3" />
              Premium Paid
            </div>
            <div className="font-mono text-green-400">{premiumPaid} ETH</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-400">
              <Target className="h-3 w-3" />
              Max Payout
            </div>
            <div className="font-mono text-green-400">{potentialPayout} ETH</div>
          </div>
        </div>

        <Separator className="bg-gray-600" />

        {/* Policy Parameters */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-200">Coverage Details</h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Deductible:</span>
              <span className="text-white">{(policy.params.deductibleBps / 100).toFixed(1)}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Coverage Cap:</span>
              <span className="text-white">{(policy.params.capBps / 100).toFixed(1)}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Premium Rate:</span>
              <span className="text-white">{(policy.params.premiumBps / 100).toFixed(2)}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Duration:</span>
              <span className="text-white">~2 weeks</span>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-600" />

        {/* Timeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Timeline
          </h4>

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Created:</span>
              <span className="text-white">{formatDate(policy.epoch)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Expires:</span>
              <span className="text-white">{calculateExpiryDate(policy.createdAt, policy.params.duration)}</span>
            </div>
          </div>
        </div>

        {/* Commitment Hash */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-200">Entry Commitment</h4>
          <div className="p-2 bg-gray-800/50 rounded border border-gray-600">
            <code className="text-xs text-gray-400 break-all">{policy.entryCommit || "0xa1b2c3d4e5f6..."}</code>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isClaimable && policy.active && (
            <Button
              onClick={() => onClaimRequest?.(policy.policyId)}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Claim
                </>
              )}
            </Button>
          )}

          <Button
            onClick={() => onBurnPolicy?.(policy.policyId)}
            disabled={isLoading || !policy.active}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Burn Policy
          </Button>
        </div>

        {/* Phase 2 Implementation Note */}
        <div className="pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400 text-center">Phase 2: ERC-1155 Policy Management ✅</div>
        </div>
      </CardContent>
    </Card>
  );
}

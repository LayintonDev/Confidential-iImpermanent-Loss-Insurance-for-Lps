import { Address } from "viem";

// Base URL for Fhenix service
const FHENIX_SERVICE_URL = process.env.NEXT_PUBLIC_FHENIX_SERVICE_URL || "http://localhost:3001";

// API response types
export interface RiskAssessmentResponse {
  success: boolean;
  data?: {
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
    factors: {
      volatility: number;
      liquidity: number;
      historicalLoss: number;
      poolAge: number;
    };
    recommendations: string[];
  };
  error?: string;
}

export interface PremiumCalculationResponse {
  success: boolean;
  data?: {
    basePremium: string; // BigInt as string
    adjustedPremium: string; // BigInt as string
    premiumBps: number;
    discountApplied: number;
    breakdown: {
      riskComponent: string;
      poolComponent: string;
      timeComponent: string;
      confidentialityBonus: string;
    };
  };
  error?: string;
}

export interface PolicyValidationResponse {
  success: boolean;
  data?: {
    isValid: boolean;
    estimatedPayout: string; // BigInt as string
    riskLevel: "low" | "medium" | "high";
    validationErrors: string[];
    recommendations: string[];
  };
  error?: string;
}

export interface ClaimProcessingResponse {
  success: boolean;
  data?: {
    isEligible: boolean;
    calculatedPayout: string; // BigInt as string
    confidentialProof: string;
    validationSteps: string[];
    processingTime: number;
  };
  error?: string;
}

// API client class
export class FhenixApiClient {
  private baseUrl: string;

  constructor(baseUrl = FHENIX_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Assess risk for a given pool and user parameters
   */
  async assessRisk(params: {
    poolAddress: Address;
    token0: Address;
    token1: Address;
    liquidityAmount: bigint;
    userAddress: Address;
    duration: number; // in seconds
  }): Promise<RiskAssessmentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/fhenix/assess-risk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolAddress: params.poolAddress,
          token0: params.token0,
          token1: params.token1,
          liquidityAmount: params.liquidityAmount.toString(),
          userAddress: params.userAddress,
          duration: params.duration,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Risk assessment failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Risk assessment failed",
      };
    }
  }

  /**
   * Calculate premium using confidential computation
   */
  async calculatePremium(params: {
    poolAddress: Address;
    coverage: bigint;
    duration: number;
    userRiskProfile: {
      historicalLosses: number;
      portfolioSize: string;
      experienceLevel: "beginner" | "intermediate" | "expert";
    };
    poolMetrics: {
      volatility: number;
      liquidity: bigint;
      volume24h: bigint;
    };
  }): Promise<PremiumCalculationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/fhenix/calculate-premium`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolAddress: params.poolAddress,
          coverage: params.coverage.toString(),
          duration: params.duration,
          userRiskProfile: params.userRiskProfile,
          poolMetrics: {
            ...params.poolMetrics,
            liquidity: params.poolMetrics.liquidity.toString(),
            volume24h: params.poolMetrics.volume24h.toString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Premium calculation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Premium calculation failed",
      };
    }
  }

  /**
   * Validate policy parameters before creation
   */
  async validatePolicy(params: {
    poolAddress: Address;
    userAddress: Address;
    coverage: bigint;
    premium: bigint;
    duration: number;
    deductibleBps: number;
    capBps: number;
  }): Promise<PolicyValidationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/fhenix/validate-policy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolAddress: params.poolAddress,
          userAddress: params.userAddress,
          coverage: params.coverage.toString(),
          premium: params.premium.toString(),
          duration: params.duration,
          deductibleBps: params.deductibleBps,
          capBps: params.capBps,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Policy validation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Policy validation failed",
      };
    }
  }

  /**
   * Process claim with confidential computation
   */
  async processClaim(params: {
    policyId: string;
    userAddress: Address;
    claimAmount: bigint;
    priceProof: {
      entryPrice: bigint;
      currentPrice: bigint;
      timestamp: number;
    };
    liquidityProof: {
      initialLiquidity: bigint;
      currentLiquidity: bigint;
    };
  }): Promise<ClaimProcessingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/fhenix/process-claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          policyId: params.policyId,
          userAddress: params.userAddress,
          claimAmount: params.claimAmount.toString(),
          priceProof: {
            ...params.priceProof,
            entryPrice: params.priceProof.entryPrice.toString(),
            currentPrice: params.priceProof.currentPrice.toString(),
          },
          liquidityProof: {
            initialLiquidity: params.liquidityProof.initialLiquidity.toString(),
            currentLiquidity: params.liquidityProof.currentLiquidity.toString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Claim processing failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Claim processing failed",
      };
    }
  }

  /**
   * Health check for Fhenix service
   */
  async healthCheck(): Promise<{ status: "healthy" | "unhealthy"; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: "GET",
      });

      if (!response.ok) {
        return { status: "unhealthy", message: `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      return {
        status: data.status === "healthy" ? "healthy" : "unhealthy",
        message: data.message || `Service is ${data.status}`,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export a singleton instance
export const fhenixApi = new FhenixApiClient();

// Hook for using Fhenix API with React
export function useFhenixApi() {
  return fhenixApi;
}

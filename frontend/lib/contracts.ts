import { Address } from "viem";
import { useCallback, useState } from "react";
import { useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";

// Updated Contract ABIs for deployed Sepolia contracts

export const CONFIDENTIAL_IL_HOOK_ABI = [
  // Hook interface functions
  {
    type: "function",
    name: "beforeInitialize",
    inputs: [
      { name: "pool", type: "address" },
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterInitialize",
    inputs: [
      { name: "pool", type: "address" },
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeAddLiquidity",
    inputs: [
      { name: "pool", type: "address" },
      { name: "lp", type: "address" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterAddLiquidity",
    inputs: [
      { name: "pool", type: "address" },
      { name: "lp", type: "address" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeRemoveLiquidity",
    inputs: [
      { name: "pool", type: "address" },
      { name: "policyId", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterRemoveLiquidity",
    inputs: [
      { name: "pool", type: "address" },
      { name: "lp", type: "address" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeSwap",
    inputs: [
      { name: "pool", type: "address" },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "afterSwap",
    inputs: [
      { name: "pool", type: "address" },
      { name: "feeGrowthGlobal0", type: "uint128" },
      { name: "feeGrowthGlobal1", type: "uint128" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  // Router compatibility functions
  {
    type: "function",
    name: "getHookPermissions",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "beforeInitialize", type: "bool" },
          { name: "afterInitialize", type: "bool" },
          { name: "beforeAddLiquidity", type: "bool" },
          { name: "afterAddLiquidity", type: "bool" },
          { name: "beforeRemoveLiquidity", type: "bool" },
          { name: "afterRemoveLiquidity", type: "bool" },
          { name: "beforeSwap", type: "bool" },
          { name: "afterSwap", type: "bool" },
          { name: "beforeDonate", type: "bool" },
          { name: "afterDonate", type: "bool" },
        ],
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "quotePremiumImpact",
    inputs: [
      { name: "pool", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "premiumFee", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSwapGasOverhead",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ name: "gasOverhead", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsInsurance",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ name: "supported", type: "bool" }],
    stateMutability: "view",
  },
  // Admin functions
  {
    type: "function",
    name: "whitelistPool",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeFromWhitelist",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // State getters
  {
    type: "function",
    name: "whitelistedPools",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasInsurance",
    inputs: [
      { name: "pool", type: "address" },
      { name: "lp", type: "address" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClaimStatus",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ name: "status", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claims",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      { name: "status", type: "uint8" },
      { name: "requestTimestamp", type: "uint256" },
      { name: "policyId", type: "uint256" },
      { name: "exitCommit", type: "bytes32" },
      { name: "claimer", type: "address" },
      { name: "requestedAmount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "commitmentHashes",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "exitCommitmentHashes",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "policyManager",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "insuranceVault",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeSplitter",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "togglePause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateClaimStatus",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "newStatus", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "PolicyCreated",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "lp", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "epoch", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PremiumSkimmed",
    inputs: [
      { name: "pool", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ClaimRequested",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "commitmentC", type: "bytes32" },
    ],
  },
] as const;

export const INSURANCE_VAULT_ABI = [
  // Core functions
  {
    type: "function",
    name: "depositPremium",
    inputs: [
      { name: "pool", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "solventFor",
    inputs: [{ name: "payout", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "payClaim",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // State getters
  {
    type: "function",
    name: "reserves",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalReserves",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalPremiumsCollected",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalClaimsPaid",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimsPaid",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReserveRatio",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ name: "ratio", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVaultStats",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [
      { name: "totalReserves_", type: "uint256" },
      { name: "totalPremiums", type: "uint256" },
      { name: "totalClaims", type: "uint256" },
      { name: "reserveRatio", type: "uint256" },
    ],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "PremiumSkimmed",
    inputs: [
      { name: "pool", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ClaimPaid",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ReservesDeposited",
    inputs: [
      { name: "pool", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
] as const;

export const POLICY_MANAGER_ABI = [
  // Core policy management
  {
    type: "function",
    name: "mintPolicy",
    inputs: [
      { name: "lp", type: "address" },
      { name: "pool", type: "address" },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "deductibleBps", type: "uint256" },
          { name: "capBps", type: "uint256" },
          { name: "premiumBps", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "pool", type: "address" },
        ],
      },
      { name: "entryCommit", type: "bytes32" },
    ],
    outputs: [{ name: "policyId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "burnPolicy",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Policy queries
  {
    type: "function",
    name: "ownerOfPolicy",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPolicy",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "lp", type: "address" },
          { name: "pool", type: "address" },
          {
            name: "params",
            type: "tuple",
            components: [
              { name: "deductibleBps", type: "uint256" },
              { name: "capBps", type: "uint256" },
              { name: "premiumBps", type: "uint256" },
              { name: "duration", type: "uint256" },
              { name: "pool", type: "address" },
            ],
          },
          { name: "entryCommit", type: "bytes32" },
          { name: "createdAt", type: "uint256" },
          { name: "epoch", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPoliciesByLP",
    inputs: [{ name: "lp", type: "address" }],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPoliciesByPool",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isValidPolicy",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ name: "valid", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isPolicyExpired",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ name: "expired", type: "bool" }],
    stateMutability: "view",
  },
  // State variables
  {
    type: "function",
    name: "currentPolicyId",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "policies",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      { name: "lp", type: "address" },
      { name: "pool", type: "address" },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "deductibleBps", type: "uint256" },
          { name: "capBps", type: "uint256" },
          { name: "premiumBps", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "pool", type: "address" },
        ],
      },
      { name: "entryCommit", type: "bytes32" },
      { name: "createdAt", type: "uint256" },
      { name: "epoch", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lpPolicies",
    inputs: [
      { name: "lp", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolPolicies",
    inputs: [
      { name: "pool", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultParams",
    inputs: [],
    outputs: [
      { name: "deductibleBps", type: "uint256" },
      { name: "capBps", type: "uint256" },
      { name: "premiumBps", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "pool", type: "address" },
    ],
    stateMutability: "view",
  },
  // Admin functions
  {
    type: "function",
    name: "updateDefaultParams",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "deductibleBps", type: "uint256" },
          { name: "capBps", type: "uint256" },
          { name: "premiumBps", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "pool", type: "address" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setBaseURI",
    inputs: [{ name: "uri", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ERC1155 functions we need
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "uri",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "PolicyCreated",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "lp", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "epoch", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PolicyBurned",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "lp", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "PolicyUpdated",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "deductibleBps", type: "uint256" },
          { name: "capBps", type: "uint256" },
          { name: "premiumBps", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "pool", type: "address" },
        ],
      },
    ],
  },
] as const;

export const EIGEN_AVS_MANAGER_ABI = [
  // Operator management
  {
    type: "function",
    name: "registerOperator",
    inputs: [
      { name: "operator", type: "address" },
      { name: "stake", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registerOperator",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "slashOperator",
    inputs: [
      { name: "operator", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Attestation functions
  {
    type: "function",
    name: "submitAttestation",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "fhenixSig", type: "bytes" },
      { name: "ivsSig", type: "bytes" },
      { name: "payout", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifySignatures",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "fhenixSig", type: "bytes" },
      { name: "ivsSig", type: "bytes" },
    ],
    outputs: [{ name: "valid", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "settleClaim",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "payout", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rejectClaim",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // State getters
  {
    type: "function",
    name: "operators",
    inputs: [{ name: "operator", type: "address" }],
    outputs: [
      { name: "stake", type: "uint256" },
      { name: "isActive", type: "bool" },
      { name: "slashingHistory", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "operatorList",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minimumStake",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "signatureThreshold",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "settledPolicies",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "insuranceVault",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "fhenixProxy",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  // Admin functions
  {
    type: "function",
    name: "updateThreshold",
    inputs: [{ name: "newThreshold", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMinimumStake",
    inputs: [{ name: "newMinimum", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "AttestationSubmitted",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "fhenixSig", type: "bytes" },
      { name: "ivsSig", type: "bytes" },
      { name: "payout", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ClaimSettled",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "payout", type: "uint256" },
      { name: "to", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "OperatorRegistered",
    inputs: [
      { name: "operator", type: "address", indexed: true },
      { name: "stake", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "OperatorSlashed",
    inputs: [
      { name: "operator", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "event",
    name: "ClaimRejected",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "event",
    name: "AttestationChallenged",
    inputs: [
      { name: "policyId", type: "uint256", indexed: true },
      { name: "challenger", type: "address", indexed: true },
      { name: "evidence", type: "bytes" },
    ],
  },
  {
    type: "event",
    name: "ThresholdUpdated",
    inputs: [{ name: "newThreshold", type: "uint256" }],
  },
  {
    type: "event",
    name: "MinimumStakeUpdated",
    inputs: [{ name: "newMinimum", type: "uint256" }],
  },
] as const;

// Additional ABIs for supporting contracts

export const FEE_SPLITTER_ABI = [
  {
    type: "function",
    name: "extractPremium",
    inputs: [
      { name: "pool", type: "address" },
      { name: "feeGrowthGlobal0", type: "uint256" },
      { name: "feeGrowthGlobal1", type: "uint256" },
    ],
    outputs: [{ name: "premiumAmount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "calculateExpectedPremium",
    inputs: [
      { name: "pool", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "expectedPremium", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initializePool",
    inputs: [
      { name: "pool", type: "address" },
      { name: "feeGrowthGlobal0", type: "uint256" },
      { name: "feeGrowthGlobal1", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const FHENIX_COMPUTE_PROXY_ABI = [
  {
    type: "function",
    name: "requestComputation",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "entryCommit", type: "bytes32" },
      { name: "exitCommit", type: "bytes32" },
    ],
    outputs: [{ name: "computeId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getComputeResult",
    inputs: [{ name: "computeId", type: "uint256" }],
    outputs: [
      { name: "payout", type: "uint256" },
      { name: "signature", type: "bytes" },
      { name: "isReady", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

export const PAYOUT_VAULT_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balance",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Contract addresses from environment variables
export const CONTRACT_ADDRESSES = {
  HOOK: process.env.NEXT_PUBLIC_HOOK_ADDRESS as Address,
  VAULT: process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address,
  POLICY_MANAGER: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
  AVS_MANAGER: process.env.NEXT_PUBLIC_AVS_MANAGER_ADDRESS as Address,
  FHENIX_PROXY: process.env.NEXT_PUBLIC_FHENIX_PROXY_ADDRESS as Address,
  PAYOUT_VAULT: process.env.NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS as Address,
} as const;

// Contract deployment info for verification
export const DEPLOYMENT_INFO = {
  CHAIN_ID: 11155111, // Sepolia
  BLOCK_NUMBER: 7387624, // Deployment block
  ADDRESSES: {
    HOOK: "0x71c0C5463a719ACFfCD3Cacabc6952d35695a358" as Address,
    VAULT: "0x6399Afbe925A2b80269d3A455270d7d0d62b5159" as Address,
    POLICY_MANAGER: "0x9146E9a3A04c39B0A30709A240f542B05B9fa1a3" as Address,
    AVS_MANAGER: "0x2746E0dE6c874d278412BCbb334AE2debb59B766" as Address,
    FHENIX_PROXY: "0xf8788c926645761347cAe6e482a8CF4Aa00B552c" as Address,
    PAYOUT_VAULT: "0xa9718bCD97F4094c17A66dbca64C2295a0ae1108" as Address,
    FEE_SPLITTER: "0x8Da8B8B5Be27Bc66Fc6B9BdCDE8DfE40073F2e11" as Address,
  },
  ETHERSCAN_BASE: "https://sepolia.etherscan.io",
} as const;

// Utility types for TypeScript integration
export type ClaimStatus = "None" | "Requested" | "Attested" | "Settled" | "Rejected";
export type HookPermissions = {
  beforeInitialize: boolean;
  afterInitialize: boolean;
  beforeAddLiquidity: boolean;
  afterAddLiquidity: boolean;
  beforeRemoveLiquidity: boolean;
  afterRemoveLiquidity: boolean;
  beforeSwap: boolean;
  afterSwap: boolean;
  beforeDonate: boolean;
  afterDonate: boolean;
};

export type PolicyParams = {
  deductibleBps: bigint;
  capBps: bigint;
  premiumBps: bigint;
  duration: bigint;
  pool: Address;
};

export type Policy = {
  lp: Address;
  pool: Address;
  params: PolicyParams;
  entryCommit: `0x${string}`;
  createdAt: bigint;
  epoch: bigint;
  active: boolean;
};

export type ClaimData = {
  status: number;
  requestTimestamp: bigint;
  policyId: bigint;
  exitCommit: `0x${string}`;
  claimer: Address;
  requestedAmount: bigint;
};

export type OperatorInfo = {
  stake: bigint;
  isActive: boolean;
  slashingHistory: bigint;
};

// Helper functions for contract interaction
export const getContractUrl = (contractName: keyof typeof DEPLOYMENT_INFO.ADDRESSES) => {
  const address = DEPLOYMENT_INFO.ADDRESSES[contractName];
  return `${DEPLOYMENT_INFO.ETHERSCAN_BASE}/address/${address}`;
};

export const formatClaimStatus = (status: number): ClaimStatus => {
  const statusMap: Record<number, ClaimStatus> = {
    0: "None",
    1: "Requested",
    2: "Attested",
    3: "Settled",
    4: "Rejected",
  };
  return statusMap[status] || "None";
};

export const encodeInsuranceData = (params: {
  enabled: boolean;
  deductibleBps?: number;
  capBps?: number;
  premiumBps?: number;
}): `0x${string}` => {
  if (!params.enabled) {
    return "0x00";
  }

  // Encode: 1 byte flag + 3 * 4 bytes for uint32 params
  const flag = "01";
  const deductible = (params.deductibleBps || 1000).toString(16).padStart(8, "0");
  const cap = (params.capBps || 5000).toString(16).padStart(8, "0");
  const premium = (params.premiumBps || 3).toString(16).padStart(8, "0");

  return `0x${flag}${deductible}${cap}${premium}` as `0x${string}`;
};

// Enhanced hook for reading contract data with proper typing
export function useConfidentialILHook() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Event watching hooks
  const watchPolicyCreated = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
      abi: CONFIDENTIAL_IL_HOOK_ABI,
      eventName: "PolicyCreated",
      onLogs: callback,
    });
  }, []);

  const watchClaimRequested = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.HOOK as `0x${string}`,
      abi: CONFIDENTIAL_IL_HOOK_ABI,
      eventName: "ClaimRequested",
      onLogs: callback,
    });
  }, []);

  return {
    watchPolicyCreated,
    watchClaimRequested,
    isWritePending,
  };
}

// Insurance Vault interaction hook
export function useInsuranceVault() {
  const { data: totalReserves } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT as `0x${string}`,
    abi: INSURANCE_VAULT_ABI,
    functionName: "totalReserves",
  });

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const getPoolReserves = useCallback((pool: string) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      functionName: "reserves",
      args: [pool as `0x${string}`],
    });
  }, []);

  const checkSolvency = useCallback((payout: bigint) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      functionName: "solventFor",
      args: [payout],
    });
  }, []);

  const depositPremium = useCallback(
    async (pool: string, amount: bigint) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.VAULT as `0x${string}`,
        abi: INSURANCE_VAULT_ABI,
        functionName: "depositPremium",
        args: [pool, amount],
      } as any);
    },
    [writeContractAsync]
  );

  return {
    totalReserves,
    getPoolReserves,
    checkSolvency,
    depositPremium,
    isWritePending,
  };
}

// Policy Manager interaction hook
export function usePolicyManager() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const getPolicyDetails = useCallback((policyId: bigint) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.POLICY_MANAGER as `0x${string}`,
      abi: POLICY_MANAGER_ABI,
      functionName: "policies",
      args: [policyId],
    });
  }, []);

  const getPolicyBalance = useCallback((owner: string, policyId: bigint) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.POLICY_MANAGER as `0x${string}`,
      abi: POLICY_MANAGER_ABI,
      functionName: "balanceOf",
      args: [owner as `0x${string}`, policyId],
    });
  }, []);

  const mintPolicy = useCallback(
    async (lp: string, pool: string, params: PolicyParams, entryCommit: string) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER as `0x${string}`,
        abi: POLICY_MANAGER_ABI,
        functionName: "mintPolicy",
        args: [lp, pool, [params.capBps, params.deductibleBps, params.duration], entryCommit],
      } as any);
    },
    [writeContractAsync]
  );

  const burnPolicy = useCallback(
    async (policyId: bigint) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.POLICY_MANAGER as `0x${string}`,
        abi: POLICY_MANAGER_ABI,
        functionName: "burnPolicy",
        args: [policyId],
      } as any);
    },
    [writeContractAsync]
  );

  return {
    getPolicyDetails,
    getPolicyBalance,
    mintPolicy,
    burnPolicy,
    isWritePending,
  };
}

// AVS Manager interaction hook
export function useAVSManager() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const getOperatorStake = useCallback((operator: string) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
      abi: EIGEN_AVS_MANAGER_ABI,
      functionName: "operators",
      args: [operator as `0x${string}`],
    });
  }, []);

  const submitAttestation = useCallback(
    async (policyId: bigint, fhenixSig: string, ivsSig: string, payout: bigint) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
        abi: EIGEN_AVS_MANAGER_ABI,
        functionName: "submitAttestation",
        args: [policyId, fhenixSig, ivsSig, payout],
      } as any);
    },
    [writeContractAsync]
  );

  const watchClaimAttested = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
      abi: EIGEN_AVS_MANAGER_ABI,
      eventName: "AttestationSubmitted",
      onLogs: callback,
    });
  }, []);

  const watchClaimSettled = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.AVS_MANAGER as `0x${string}`,
      abi: EIGEN_AVS_MANAGER_ABI,
      eventName: "ClaimSettled",
      onLogs: callback,
    });
  }, []);

  return {
    getOperatorStake,
    submitAttestation,
    watchClaimAttested,
    watchClaimSettled,
    isWritePending,
  };
}

// Transaction monitoring utilities
export interface TransactionStatus {
  hash?: string;
  status: "idle" | "pending" | "success" | "error";
  error?: string;
  receipt?: any;
}

export function useTransactionMonitor() {
  const [transactions, setTransactions] = useState<Map<string, TransactionStatus>>(new Map());

  const addTransaction = useCallback((id: string, hash: string) => {
    setTransactions((prev: Map<string, TransactionStatus>) => new Map(prev.set(id, { hash, status: "pending" })));
  }, []);

  const updateTransaction = useCallback((id: string, update: Partial<TransactionStatus>) => {
    setTransactions((prev: Map<string, TransactionStatus>) => {
      const current = prev.get(id) || { status: "idle" };
      return new Map(prev.set(id, { ...current, ...update }));
    });
  }, []);

  const getTransaction = useCallback(
    (id: string) => {
      return transactions.get(id);
    },
    [transactions]
  );

  return {
    transactions,
    addTransaction,
    updateTransaction,
    getTransaction,
  };
}

// Gas estimation utilities
export function useGasEstimation() {
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);

  const estimateGas = useCallback(
    async (contractAddress: string, abi: any[], functionName: string, args: any[]) => {
      try {
        // This would integrate with wagmi's gas estimation
        // For now, return a mock estimate
        return {
          gasLimit: BigInt(300000),
          gasPrice: gasPrice || BigInt(20000000000), // 20 gwei
          maxFeePerGas: gasPrice || BigInt(30000000000), // 30 gwei
          maxPriorityFeePerGas: BigInt(2000000000), // 2 gwei
        };
      } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
      }
    },
    [gasPrice]
  );

  return {
    estimateGas,
    gasPrice,
  };
}

import { Address } from "viem";
import { useCallback, useState } from "react";
import { useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";

// Import contract ABIs
import INSURANCE_VAULT_ABI from "./abi/InsuranceVault.json";

// Export the ABI for other modules
export { INSURANCE_VAULT_ABI };

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

export const POLICY_MANAGER_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "admin",
        type: "address",
      },
      {
        internalType: "string",
        name: "initialURI",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "ERC1155InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC1155InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "idsLength",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "valuesLength",
        type: "uint256",
      },
    ],
    name: "ERC1155InvalidArrayLength",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
    ],
    name: "ERC1155InvalidOperator",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC1155InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC1155InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "ERC1155MissingApprovalForAll",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "allowance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidPolicyDuration",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidPolicyParams",
    type: "error",
  },
  {
    inputs: [],
    name: "PolicyNotActive",
    type: "error",
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint8",
        name: "bits",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "SafeCastOverflowedUintDowncast",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ClaimPaid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
    ],
    name: "PolicyCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "coverage",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "premium",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "commitment",
        type: "uint256",
      },
    ],
    name: "PolicyMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "values",
        type: "uint256[]",
      },
    ],
    name: "TransferBatch",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "TransferSingle",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "value",
        type: "string",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "URI",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "USDC",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "accounts",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
    ],
    name: "balanceOfBatch",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
    ],
    name: "cancelPolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "defaultParams",
    outputs: [
      {
        internalType: "uint16",
        name: "deductibleBps",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "capBps",
        type: "uint16",
      },
      {
        internalType: "uint256",
        name: "maxCoverage",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "minCoverage",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "maxDurationDays",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "minDurationDays",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasRole",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
    ],
    name: "isApprovedForAll",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "coverage",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "premium",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "commitment",
        type: "uint256",
      },
    ],
    name: "mintPolicy",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextPolicyId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "policyId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "claimAmount",
        type: "uint256",
      },
    ],
    name: "payoutClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "policies",
    outputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "coverage",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "premium",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "startTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "commitment",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isActive",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "callerConfirmation",
        type: "address",
      },
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "values",
        type: "uint256[]",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "safeBatchTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint16",
            name: "deductibleBps",
            type: "uint16",
          },
          {
            internalType: "uint16",
            name: "capBps",
            type: "uint16",
          },
          {
            internalType: "uint256",
            name: "maxCoverage",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "minCoverage",
            type: "uint256",
          },
          {
            internalType: "uint32",
            name: "maxDurationDays",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "minDurationDays",
            type: "uint32",
          },
        ],
        internalType: "struct PolicyManager.PolicyParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "setDefaultParams",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "uri",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
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

// SimpleV4Hook ABI for V4 integration
export const SIMPLE_V4_HOOK_ABI = [
  {
    type: "function",
    name: "afterAddLiquidity",
    inputs: [
      { name: "sender", type: "address" },
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterSwap",
    inputs: [
      { name: "sender", type: "address" },
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      { name: "amount0Delta", type: "int256" },
      { name: "amount1Delta", type: "int256" },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getHookPermissions",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isV4Compatible",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "InsurancePolicyCreated",
    inputs: [
      { name: "poolAddress", type: "address", indexed: true },
      { name: "lpAddress", type: "address", indexed: true },
      { name: "policyId", type: "uint256", indexed: true },
      { name: "coverage", type: "uint256", indexed: false },
      { name: "duration", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PremiumExtracted",
    inputs: [
      { name: "poolAddress", type: "address", indexed: true },
      { name: "swapper", type: "address", indexed: true },
      { name: "volume", type: "uint256", indexed: false },
      { name: "premium", type: "uint256", indexed: false },
    ],
  },
] as const;

// Mock V4Router ABI for testing (simplified interface)
export const V4_ROUTER_ABI = [
  {
    type: "function",
    name: "addLiquidity",
    inputs: [
      {
        name: "poolKey",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "liquidityParams",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "payable",
  },
] as const;

// Contract addresses from environment variables
export const CONTRACT_ADDRESSES = {
  HOOK: process.env.NEXT_PUBLIC_HOOK_ADDRESS as Address,
  SIMPLE_V4_HOOK: process.env.NEXT_PUBLIC_SIMPLE_V4_HOOK_ADDRESS as Address,
  CONFIDENTIAL_IL_HOOK: process.env.NEXT_PUBLIC_CONFIDENTIAL_IL_HOOK_ADDRESS as Address,
  V4_ROUTER: process.env.NEXT_PUBLIC_HOOK_ADDRESS as Address, // For testing, use hook directly
  VAULT: process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address,
  POLICY_MANAGER: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
  AVS_MANAGER: process.env.NEXT_PUBLIC_AVS_MANAGER_ADDRESS as Address,
  EIGEN_AVS_MANAGER: process.env.NEXT_PUBLIC_EIGEN_AVS_MANAGER_ADDRESS as Address,
  FHENIX_PROXY: process.env.NEXT_PUBLIC_FHENIX_PROXY_ADDRESS as Address,
  FHENIX_COMPUTE_PROXY: process.env.NEXT_PUBLIC_FHENIX_COMPUTE_PROXY_ADDRESS as Address,
  PAYOUT_VAULT: process.env.NEXT_PUBLIC_PAYOUT_VAULT_ADDRESS as Address,
  INSURANCE_VAULT: process.env.NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS as Address,
} as const;

// Contract deployment info for verification - dynamically determined
export const DEPLOYMENT_INFO = {
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111"),
  BLOCK_NUMBER: parseInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || "0"),
  ADDRESSES: CONTRACT_ADDRESSES, // Use dynamic addresses
  ETHERSCAN_BASE:
    parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111") === 31337
      ? "http://localhost:8545" // Local Anvil
      : "https://sepolia.etherscan.io", // Sepolia
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

// InsuranceVault interaction hook
export function useInsuranceVault() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const getVaultStats = useCallback((pool: string) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      functionName: "getPoolStats",
      args: [pool as `0x${string}`],
    });
  }, []);

  const getTotalPremiums = useCallback((pool: string) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      functionName: "totalPremiumsCollected",
      args: [pool as `0x${string}`],
    });
  }, []);

  const getReserves = useCallback((pool: string) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      functionName: "reserves",
      args: [pool as `0x${string}`],
    });
  }, []);

  const checkSolvency = useCallback((payout: bigint) => {
    // For backwards compatibility - this checks if vault has enough reserves
    return useReadContract({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      functionName: "reserves",
      args: ["0x0000000000000000000000000000000000000000"], // Default pool for now
    });
  }, []);

  const depositFunds = useCallback(
    async (amount: bigint) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
        abi: INSURANCE_VAULT_ABI,
        functionName: "depositFunds",
        value: amount,
      } as any);
    },
    [writeContractAsync]
  );

  const watchClaimPaid = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      eventName: "ClaimPaid",
      onLogs: callback,
    });
  }, []);

  const watchPremiumDeposited = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      eventName: "PremiumDeposited",
      onLogs: callback,
    });
  }, []);

  const watchFundsDeposited = useCallback((callback: (log: any) => void) => {
    return useWatchContractEvent({
      address: CONTRACT_ADDRESSES.INSURANCE_VAULT as `0x${string}`,
      abi: INSURANCE_VAULT_ABI,
      eventName: "FundsDeposited",
      onLogs: callback,
    });
  }, []);

  return {
    getVaultStats,
    getTotalPremiums,
    getReserves,
    checkSolvency,
    depositFunds,
    watchClaimPaid,
    watchPremiumDeposited,
    watchFundsDeposited,
    isWritePending,
  };
}

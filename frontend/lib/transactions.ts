import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
  useEstimateGas,
  useAccount,
  useBalance,
  usePublicClient,
} from "wagmi";
import { toast } from "react-hot-toast";
import { formatEther, parseEther, Address, Hash } from "viem";
import { useAppStore } from "./store";
import { POLICY_MANAGER_ABI, INSURANCE_VAULT_ABI, PAYOUT_VAULT_ABI, CONTRACT_ADDRESSES } from "./contracts";
import { useState, useCallback, useEffect } from "react";

export interface TransactionConfig {
  address: Address;
  abi: readonly any[];
  functionName: string;
  args?: any[];
  value?: bigint;
  onSuccess?: (txHash: Hash) => void;
  onError?: (error: Error) => void;
  onConfirmed?: (receipt: any) => void;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCost: bigint;
}

// Enhanced transaction hook with comprehensive error handling and monitoring
export function useTransaction(config: TransactionConfig) {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addTransaction, updateTransaction } = useAppStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  // Simulate transaction to check for potential failures
  const {
    data: simulationData,
    error: simulationError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: config.address,
    abi: config.abi,
    functionName: config.functionName,
    args: config.args,
    value: config.value,
    query: {
      enabled: !!address && !!config.args,
    },
  });

  // Write contract with proper error handling
  const { writeContract, data: writeData, error: writeError, isPending: isWritePending } = useWriteContract();

  // Wait for transaction confirmation
  const {
    data: receipt,
    isLoading: isConfirming,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
    query: {
      enabled: !!txHash,
    },
  });

  // Execute transaction
  const execute = useCallback(async () => {
    if (!address || !simulationData?.request) {
      toast.error("Transaction simulation failed");
      return;
    }

    setIsExecuting(true);

    try {
      // Check balance sufficiency
      if (balance && config.value) {
        const totalCost = config.value + (simulationData.request.gas || BigInt(0)) * BigInt(20000000000); // Estimate gas cost
        if (balance.value < totalCost) {
          throw new Error(`Insufficient balance. Need ${formatEther(totalCost)} ETH`);
        }
      }

      // Add transaction to store
      const txId = `tx-${Date.now()}`;
      addTransaction({
        id: txId,
        type: "mint-policy",
        description: `Execute ${config.functionName}`,
        status: "pending",
      });

      // Execute write
      writeContract(simulationData.request);

      // The hash will be available via writeData from the hook
      if (writeData) {
        setTxHash(writeData);

        // Update transaction with hash
        updateTransaction(txId, {
          hash: writeData,
          status: "pending",
        });

        config.onSuccess?.(writeData);
        toast.success("Transaction submitted successfully!");
      }
    } catch (error) {
      console.error("Transaction execution failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Transaction failed";
      toast.error(errorMessage);
      config.onError?.(error as Error);
    } finally {
      setIsExecuting(false);
    }
  }, [address, simulationData, balance, config, addTransaction, updateTransaction, writeContract]);

  // Handle transaction confirmation
  useEffect(() => {
    if (receipt && txHash) {
      const txId = `tx-${txHash}`;
      updateTransaction(txId, {
        status: receipt.status === "success" ? "success" : "error",
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      });

      if (receipt.status === "success") {
        toast.success("Transaction confirmed!");
        config.onConfirmed?.(receipt);
      } else {
        toast.error("Transaction failed");
        config.onError?.(new Error("Transaction reverted"));
      }
    }
  }, [receipt, txHash, updateTransaction, config]);

  return {
    execute,
    isLoading: isExecuting || isWritePending || isConfirming,
    isSimulating,
    simulationError,
    writeError,
    confirmError,
    txHash,
    receipt,
    canExecute: !!simulationData && !simulationError && !!address,
  };
}

// Gas estimation hook
export function useGasEstimation() {
  const publicClient = usePublicClient();

  const estimateTransactionGas = useCallback(
    async (to: Address, data: `0x${string}`, value?: bigint): Promise<GasEstimate> => {
      if (!publicClient) throw new Error("Public client not available");

      const [gasLimit, gasPrice, block] = await Promise.all([
        publicClient.estimateGas({ to, data, value }),
        publicClient.getGasPrice(),
        publicClient.getBlock({ blockTag: "latest" }),
      ]);

      const maxFeePerGas = block.baseFeePerGas ? block.baseFeePerGas * BigInt(2) + gasPrice : gasPrice * BigInt(2);
      const maxPriorityFeePerGas = gasPrice;
      const estimatedCost = gasLimit * maxFeePerGas;

      return {
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
      };
    },
    [publicClient]
  );

  return { estimateTransactionGas };
}

// Policy-specific transaction hooks
export function usePolicyTransactions() {
  const { writeContractAsync } = useWriteContract();

  const { execute: executeMint, ...mintState } = useTransaction({
    address: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
    abi: POLICY_MANAGER_ABI,
    functionName: "mintPolicy",
    onSuccess: hash => {
      console.log("Policy minted:", hash);
    },
    onConfirmed: receipt => {
      console.log("Policy mint confirmed:", receipt);
    },
  });

  const { execute: executeClaim, ...claimState } = useTransaction({
    address: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
    abi: POLICY_MANAGER_ABI,
    functionName: "submitClaim",
    onSuccess: hash => {
      console.log("Claim submitted:", hash);
    },
    onConfirmed: receipt => {
      console.log("Claim submission confirmed:", receipt);
    },
  });

  const mintPolicy = useCallback(
    async (
      poolAddress: Address,
      amounts: [bigint, bigint],
      params: [number, number, number], // [capBps, deductibleBps, duration]
      merkleProof: Hash
    ) => {
      return writeContractAsync({
        address: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
        abi: POLICY_MANAGER_ABI,
        functionName: "mintPolicy",
        args: [poolAddress, amounts, params, merkleProof],
      } as any);
    },
    [writeContractAsync]
  );

  const submitClaim = useCallback(
    async (policyId: bigint, amount: bigint, merkleProof: Hash) => {
      return writeContractAsync({
        address: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
        abi: POLICY_MANAGER_ABI,
        functionName: "submitClaim",
        args: [policyId, amount, merkleProof],
      } as any);
    },
    [writeContractAsync]
  );

  return {
    mintPolicy,
    submitClaim,
    mintState,
    claimState,
  };
}

// Vault-specific transaction hooks
export function useVaultTransactions() {
  const { writeContractAsync } = useWriteContract();

  const { execute: executeDeposit, ...depositState } = useTransaction({
    address: CONTRACT_ADDRESSES.PAYOUT_VAULT,
    abi: PAYOUT_VAULT_ABI,
    functionName: "deposit",
    onSuccess: hash => {
      console.log("Vault deposit:", hash);
    },
    onConfirmed: receipt => {
      console.log("Vault deposit confirmed:", receipt);
    },
  });

  const { execute: executeWithdraw, ...withdrawState } = useTransaction({
    address: CONTRACT_ADDRESSES.PAYOUT_VAULT,
    abi: PAYOUT_VAULT_ABI,
    functionName: "withdraw",
    onSuccess: hash => {
      console.log("Vault withdrawal:", hash);
    },
    onConfirmed: receipt => {
      console.log("Vault withdrawal confirmed:", receipt);
    },
  });

  const deposit = useCallback(
    async (amount: bigint, recipient: Address) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.PAYOUT_VAULT,
        abi: PAYOUT_VAULT_ABI,
        functionName: "deposit",
        args: [amount],
        value: amount,
      } as any);
    },
    [writeContractAsync]
  );

  const withdraw = useCallback(
    async (amount: bigint, recipient: Address) => {
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.PAYOUT_VAULT,
        abi: PAYOUT_VAULT_ABI,
        functionName: "withdraw",
        args: [recipient, amount],
      } as any);
    },
    [writeContractAsync]
  );

  return {
    deposit,
    withdraw,
    depositState,
    withdrawState,
  };
}

// Comprehensive transaction monitoring
export function useTransactionMonitor() {
  const { userTransactions, updateTransaction } = useAppStore();
  const publicClient = usePublicClient();

  const monitorTransaction = useCallback(
    async (txHash: Hash) => {
      if (!publicClient) return;

      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 60000, // 1 minute timeout
        });

        const txId = `tx-${txHash}`;
        updateTransaction(txId, {
          status: receipt.status === "success" ? "success" : "error",
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
        });

        return receipt;
      } catch (error) {
        console.error("Transaction monitoring failed:", error);
        throw error;
      }
    },
    [publicClient, updateTransaction]
  );

  const getPendingTransactions = useCallback(() => {
    return userTransactions.filter((tx: any) => tx.status === "pending");
  }, [userTransactions]);

  const getTransactionsByType = useCallback(
    (type: string) => {
      return userTransactions.filter((tx: any) => tx.type === type);
    },
    [userTransactions]
  );

  return {
    monitorTransaction,
    getPendingTransactions,
    getTransactionsByType,
    userTransactions,
  };
}

// Error handling utilities
export function parseTransactionError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }
  if (message.includes("user rejected")) {
    return "Transaction rejected by user";
  }
  if (message.includes("gas too low")) {
    return "Gas limit too low";
  }
  if (message.includes("nonce too low")) {
    return "Transaction nonce too low - please try again";
  }
  if (message.includes("replacement underpriced")) {
    return "Transaction replacement underpriced";
  }
  if (message.includes("execution reverted")) {
    return "Transaction reverted - check contract conditions";
  }

  return error.message || "Transaction failed";
}

// Transaction status utilities
export function getTransactionStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "text-yellow-400";
    case "success":
      return "text-green-400";
    case "error":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function getTransactionStatusIcon(status: string): string {
  switch (status) {
    case "pending":
      return "⏳";
    case "success":
      return "✅";
    case "error":
      return "❌";
    default:
      return "⚪";
  }
}

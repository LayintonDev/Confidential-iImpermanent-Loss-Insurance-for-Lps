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
import {
  POLICY_MANAGER_ABI,
  INSURANCE_VAULT_ABI,
  PAYOUT_VAULT_ABI,
  SIMPLE_V4_HOOK_ABI,
  CONTRACT_ADDRESSES,
} from "./contracts";
import { useState, useCallback, useEffect } from "react";

// Utility to create public client for transaction monitoring
async function createTransactionClient() {
  const { createPublicClient, http } = await import("viem");
  const { foundry, sepolia } = await import("viem/chains");

  const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
  const chain = chainId === 31337 ? foundry : sepolia;

  return createPublicClient({
    chain,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });
}

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
    async (recipient: Address, pool: Address, coverage: bigint, premium: bigint, commitment: Hash): Promise<Hash> => {
      try {
        // First, submit the transaction
        const txHash = await writeContractAsync({
          address: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
          abi: POLICY_MANAGER_ABI,
          functionName: "mintPolicy",
          args: [recipient, pool, coverage, premium, commitment],
        } as any);

        console.log("Transaction submitted:", txHash);

        // Create public client for waiting for transaction receipt
        const publicClient = await createTransactionClient();

        // Wait for transaction receipt
        console.log("Waiting for transaction confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 120000, // 2 minutes timeout
        });

        console.log("Transaction receipt:", receipt);

        // Check if transaction was successful
        if (receipt.status === "reverted") {
          throw new Error("Transaction was reverted by the contract. Please check the contract state and try again.");
        }

        if (receipt.status !== "success") {
          throw new Error("Transaction failed with unknown status");
        }

        console.log("Transaction confirmed successfully");
        return txHash;
      } catch (error: any) {
        console.error("mintPolicy failed:", error);

        // Handle specific error types
        if (error.message?.includes("execution reverted")) {
          throw new Error(
            "Contract execution failed: The transaction was reverted. Please check your inputs and contract state."
          );
        }

        if (error.message?.includes("insufficient funds")) {
          throw new Error("Insufficient funds for transaction");
        }

        if (error.message?.includes("user rejected")) {
          throw new Error("Transaction was rejected by user");
        }

        // Re-throw the error to be handled by the calling component
        throw error;
      }
    },
    [writeContractAsync]
  );

  const submitClaim = useCallback(
    async (policyId: bigint, amount: bigint, merkleProof: Hash): Promise<Hash> => {
      try {
        // First, submit the transaction
        const txHash = await writeContractAsync({
          address: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS as Address,
          abi: POLICY_MANAGER_ABI,
          functionName: "submitClaim",
          args: [policyId, amount, merkleProof],
        } as any);

        console.log("Claim transaction submitted:", txHash);

        // Create public client for waiting for transaction receipt
        const publicClient = await createTransactionClient();

        // Wait for transaction receipt
        console.log("Waiting for claim transaction confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 120000, // 2 minutes timeout
        });

        console.log("Claim transaction receipt:", receipt);

        // Check if transaction was successful
        if (receipt.status === "reverted") {
          throw new Error(
            "Claim transaction was reverted by the contract. Please check the claim validity and try again."
          );
        }

        if (receipt.status !== "success") {
          throw new Error("Claim transaction failed with unknown status");
        }

        console.log("Claim transaction confirmed successfully");
        return txHash;
      } catch (error: any) {
        console.error("submitClaim failed:", error);

        // Handle specific error types
        if (error.message?.includes("execution reverted")) {
          throw new Error(
            "Claim execution failed: The transaction was reverted. Please check your claim details and policy status."
          );
        }

        if (error.message?.includes("insufficient funds")) {
          throw new Error("Insufficient funds for claim transaction");
        }

        if (error.message?.includes("user rejected")) {
          throw new Error("Claim transaction was rejected by user");
        }

        // Re-throw the error to be handled by the calling component
        throw error;
      }
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

// V4 Integration transaction hooks
export function useV4PolicyTransactions() {
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

  const addLiquidityWithInsurance = useCallback(
    async (
      token0: Address,
      token1: Address,
      fee: number,
      tickLower: number,
      tickUpper: number,
      liquidityAmount: bigint,
      coverage: bigint,
      duration: bigint
    ): Promise<Hash> => {
      try {
        if (!address) {
          throw new Error("Wallet not connected");
        }

        // Encode insurance parameters in hookData
        const { encodeAbiParameters } = await import("viem");

        const hookData = encodeAbiParameters(
          [
            { name: "coverage", type: "uint256" },
            { name: "duration", type: "uint256" },
          ],
          [coverage, duration]
        );

        // Call the V4Hook directly (simulating V4Router call)
        const txHash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.HOOK as Address,
          abi: SIMPLE_V4_HOOK_ABI,
          functionName: "afterAddLiquidity",
          args: [
            // sender - use connected wallet address
            address,
            // poolKey
            {
              token0,
              token1,
              fee,
              tickSpacing: 60,
              hooks: CONTRACT_ADDRESSES.HOOK,
            },
            // params
            {
              tickLower,
              tickUpper,
              liquidityDelta: liquidityAmount,
              salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
            // hookData
            hookData,
          ],
        } as any);

        console.log("V4 Liquidity + Insurance transaction submitted:", txHash);

        // Create public client for waiting for transaction receipt
        const publicClient = await createTransactionClient();

        // Wait for transaction receipt
        console.log("Waiting for V4 transaction confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 120000, // 2 minutes timeout
        });

        console.log("V4 Transaction receipt:", receipt);

        // Check if transaction was successful
        if (receipt.status === "reverted") {
          throw new Error(
            "V4 Transaction was reverted by the contract. Please check the contract state and try again."
          );
        }

        if (receipt.status !== "success") {
          throw new Error("V4 Transaction failed with unknown status");
        }

        console.log("V4 Transaction confirmed successfully - Insurance policy created automatically!");
        return txHash;
      } catch (error: any) {
        console.error("addLiquidityWithInsurance failed:", error);

        // Handle specific error types
        if (error.message?.includes("execution reverted")) {
          throw new Error(
            "V4 Contract execution failed: The transaction was reverted. Please check your inputs and hook configuration."
          );
        }

        if (error.message?.includes("insufficient funds")) {
          throw new Error("Insufficient funds for V4 transaction");
        }

        if (error.message?.includes("user rejected")) {
          throw new Error("V4 Transaction was rejected by user");
        }

        // Re-throw the error to be handled by the calling component
        throw error;
      }
    },
    [writeContractAsync]
  );

  return {
    addLiquidityWithInsurance,
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

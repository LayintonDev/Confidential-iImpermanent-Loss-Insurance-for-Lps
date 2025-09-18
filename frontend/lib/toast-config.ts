import { toast, Toast } from "react-hot-toast";

// Enhanced toast configurations for different transaction types
export const toastConfig = {
  // Default configuration
  default: {
    duration: 4000,
    position: "top-right" as const,
    style: {
      background: "#1f2937",
      color: "#f3f4f6",
      border: "1px solid #374151",
    },
  },

  // Success toasts
  success: {
    duration: 5000,
    icon: "✅",
    style: {
      background: "#064e3b",
      color: "#10b981",
      border: "1px solid #059669",
    },
  },

  // Error toasts
  error: {
    duration: 6000,
    icon: "❌",
    style: {
      background: "#7f1d1d",
      color: "#ef4444",
      border: "1px solid #dc2626",
    },
  },

  // Loading toasts
  loading: {
    duration: Infinity,
    icon: "⏳",
    style: {
      background: "#1e3a8a",
      color: "#3b82f6",
      border: "1px solid #2563eb",
    },
  },

  // Warning toasts
  warning: {
    duration: 5000,
    icon: "⚠️",
    style: {
      background: "#92400e",
      color: "#f59e0b",
      border: "1px solid #d97706",
    },
  },
};

// Specialized toast functions for different transaction types
export const transactionToasts = {
  // Policy creation toasts
  policy: {
    creating: () =>
      toast.loading("Creating insurance policy...", {
        id: "policy-creation",
        ...toastConfig.loading,
        icon: "🛡️",
      }),

    success: (txHash?: string) =>
      toast.success(
        `Policy created successfully! Your position is now protected.${
          txHash ? " View on Etherscan: https://sepolia.etherscan.io/tx/" + txHash : ""
        }`,
        {
          id: "policy-creation",
          ...toastConfig.success,
        }
      ),

    error: (error: string) =>
      toast.error(`Policy creation failed: ${error}`, {
        id: "policy-creation",
        ...toastConfig.error,
      }),
  },

  // Claim submission toasts
  claim: {
    submitting: () =>
      toast.loading("Submitting insurance claim...", {
        id: "claim-submission",
        ...toastConfig.loading,
        icon: "📋",
      }),

    success: (txHash?: string) =>
      toast.success(
        `Claim submitted successfully! Your claim is being processed.${
          txHash ? " View on Etherscan: https://sepolia.etherscan.io/tx/" + txHash : ""
        }`,
        {
          id: "claim-submission",
          ...toastConfig.success,
        }
      ),

    error: (error: string) =>
      toast.error(`Claim submission failed: ${error}`, {
        id: "claim-submission",
        ...toastConfig.error,
      }),
  },

  // Vault transaction toasts
  vault: {
    depositing: () =>
      toast.loading("Processing vault deposit...", {
        id: "vault-deposit",
        ...toastConfig.loading,
        icon: "💰",
      }),

    depositSuccess: (amount: string, txHash?: string) =>
      toast.success(
        `Deposit successful! ${amount} ETH deposited to vault.${
          txHash ? " View on Etherscan: https://sepolia.etherscan.io/tx/" + txHash : ""
        }`,
        {
          id: "vault-deposit",
          ...toastConfig.success,
        }
      ),

    withdrawing: () =>
      toast.loading("Processing vault withdrawal...", {
        id: "vault-withdraw",
        ...toastConfig.loading,
        icon: "💸",
      }),

    withdrawSuccess: (amount: string, txHash?: string) =>
      toast.success(
        `Withdrawal successful! ${amount} ETH withdrawn from vault.${
          txHash ? " View on Etherscan: https://sepolia.etherscan.io/tx/" + txHash : ""
        }`,
        {
          id: "vault-withdraw",
          ...toastConfig.success,
        }
      ),

    error: (operation: "deposit" | "withdraw", error: string) =>
      toast.error(`Vault ${operation} failed: ${error}`, {
        id: `vault-${operation}`,
        ...toastConfig.error,
      }),
  },

  // Wallet connection toasts
  wallet: {
    connecting: () =>
      toast.loading("Connecting wallet...", {
        id: "wallet-connection",
        ...toastConfig.loading,
        icon: "🔗",
      }),

    connected: (address: string) =>
      toast.success(`Wallet connected! ${address.slice(0, 6)}...${address.slice(-4)}`, {
        id: "wallet-connection",
        ...toastConfig.success,
      }),

    disconnected: () =>
      toast("Wallet disconnected", {
        id: "wallet-connection",
        icon: "🔌",
        ...toastConfig.default,
      }),

    switchNetwork: () =>
      toast.loading("Switching network...", {
        id: "network-switch",
        ...toastConfig.loading,
        icon: "🌐",
      }),

    networkSwitched: (networkName: string) =>
      toast.success(`Switched to ${networkName}`, {
        id: "network-switch",
        ...toastConfig.success,
      }),

    error: (error: string) =>
      toast.error(`Wallet connection failed: ${error}`, {
        id: "wallet-connection",
        ...toastConfig.error,
      }),
  },

  // General transaction toasts
  transaction: {
    rejected: () =>
      toast.error("Transaction rejected by user", {
        ...toastConfig.error,
        icon: "✋",
      }),

    insufficient: () =>
      toast.error("Insufficient funds. Please ensure you have enough ETH for gas fees.", {
        ...toastConfig.error,
        icon: "💰",
      }),

    gasHigh: () =>
      toast("High gas prices detected. Consider waiting for lower gas prices.", {
        ...toastConfig.warning,
        icon: "⛽",
      }),

    confirmation: (confirmations: number) =>
      toast(`Transaction confirmed (${confirmations}/12 confirmations)`, {
        icon: "🔄",
        ...toastConfig.default,
      }),
  },
};

// Utility function to dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Utility function to dismiss specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export default transactionToasts;

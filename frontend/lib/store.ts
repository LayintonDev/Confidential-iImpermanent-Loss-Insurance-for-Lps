import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Policy } from "./contracts";

// Transaction status types
export interface Transaction {
  id: string;
  hash?: string;
  status: "idle" | "pending" | "success" | "error";
  type: "mint-policy" | "claim" | "deposit-premium" | "attestation";
  description: string;
  timestamp: number;
  error?: string;
  receipt?: any;
  blockNumber?: bigint;
  gasUsed?: bigint;
}

// Policy state with additional UI metadata
export interface PolicyState extends Policy {
  id: string;
  premiumsPaid: bigint;
  estimatedPayout?: bigint;
  riskLevel: "low" | "medium" | "high";
  status: "active" | "claimed" | "attested" | "settled" | "expired";
  lastUpdated: number;
}

// Vault statistics
export interface VaultStats {
  totalReserves: bigint;
  poolReserves: Record<string, bigint>;
  totalPolicies: number;
  totalPayouts: bigint;
  averagePremium: bigint;
  solvencyRatio: number;
  lastUpdated: number;
}

// Application state interface
interface AppState {
  // User data
  userAddress?: string;
  userPolicies: PolicyState[];
  userTransactions: Transaction[];

  // Vault data
  vaultStats: VaultStats;

  // UI state
  isLoading: boolean;
  error?: string;
  selectedPolicyId?: string;

  // Modals and overlays
  modals: {
    createPolicy: boolean;
    claimPolicy: boolean;
    vaultDetails: boolean;
  };

  // Real-time updates
  lastEventUpdate: number;
  eventSubscriptions: string[];
}

// Actions interface
interface AppActions {
  // User actions
  setUserAddress: (address: string) => void;
  addUserPolicy: (policy: PolicyState) => void;
  updateUserPolicy: (policyId: string, updates: Partial<PolicyState>) => void;
  removeUserPolicy: (policyId: string) => void;

  // Transaction management
  addTransaction: (transaction: Omit<Transaction, "timestamp">) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  clearOldTransactions: () => void;

  // Vault statistics
  updateVaultStats: (stats: Partial<VaultStats>) => void;

  // UI state management
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setSelectedPolicy: (policyId?: string) => void;

  // Modal management
  openModal: (modal: keyof AppState["modals"]) => void;
  closeModal: (modal: keyof AppState["modals"]) => void;
  closeAllModals: () => void;

  // Event handling
  updateLastEventTime: () => void;
  addEventSubscription: (subscription: string) => void;
  removeEventSubscription: (subscription: string) => void;

  // Data refresh
  refreshUserData: () => Promise<void>;
  refreshVaultData: () => Promise<void>;

  // Reset functions
  resetUserData: () => void;
  resetAllData: () => void;
}

// Initial state
const initialState: AppState = {
  userPolicies: [],
  userTransactions: [],
  vaultStats: { 
    totalReserves: BigInt(0),
    poolReserves: {},
    totalPolicies: 0,
    totalPayouts: BigInt(0),
    averagePremium: BigInt(0),
    solvencyRatio: 1,
    lastUpdated: Date.now(),
  },
  isLoading: false,
  modals: {
    createPolicy: false,
    claimPolicy: false,
    vaultDetails: false,
  },
  lastEventUpdate: Date.now(),
  eventSubscriptions: [],
};

// Create the store with persistence and devtools
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // User actions
        setUserAddress: (address: string) => {
          set({ userAddress: address }, false, "setUserAddress");
        },

        addUserPolicy: (policy: PolicyState) => {
          set(
            state => ({
              userPolicies: [...state.userPolicies, policy],
            }),
            false,
            "addUserPolicy"
          );
        },

        updateUserPolicy: (policyId: string, updates: Partial<PolicyState>) => {
          set(
            state => ({
              userPolicies: state.userPolicies.map(policy =>
                policy.id === policyId ? { ...policy, ...updates, lastUpdated: Date.now() } : policy
              ),
            }),
            false,
            "updateUserPolicy"
          );
        },

        removeUserPolicy: (policyId: string) => {
          set(
            state => ({
              userPolicies: state.userPolicies.filter(policy => policy.id !== policyId),
            }),
            false,
            "removeUserPolicy"
          );
        },

        // Transaction management
        addTransaction: (transaction: Omit<Transaction, "timestamp">) => {
          const newTransaction: Transaction = {
            ...transaction,
            timestamp: Date.now(),
          };

          set(
            state => ({
              userTransactions: [newTransaction, ...state.userTransactions].slice(0, 100), // Keep last 100
            }),
            false,
            "addTransaction"
          );
        },

        updateTransaction: (id: string, updates: Partial<Transaction>) => {
          set(
            state => ({
              userTransactions: state.userTransactions.map(tx => (tx.id === id ? { ...tx, ...updates } : tx)),
            }),
            false,
            "updateTransaction"
          );
        },

        clearOldTransactions: () => {
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          set(
            state => ({
              userTransactions: state.userTransactions.filter(tx => tx.timestamp > oneWeekAgo),
            }),
            false,
            "clearOldTransactions"
          );
        },

        // Vault statistics
        updateVaultStats: (stats: Partial<VaultStats>) => {
          set(
            state => ({
              vaultStats: {
                ...state.vaultStats,
                ...stats,
                lastUpdated: Date.now(),
              },
            }),
            false,
            "updateVaultStats"
          );
        },

        // UI state management
        setLoading: (loading: boolean) => {
          set({ isLoading: loading }, false, "setLoading");
        },

        setError: (error?: string) => {
          set({ error }, false, "setError");
        },

        setSelectedPolicy: (policyId?: string) => {
          set({ selectedPolicyId: policyId }, false, "setSelectedPolicy");
        },

        // Modal management
        openModal: (modal: keyof AppState["modals"]) => {
          set(
            state => ({
              modals: { ...state.modals, [modal]: true },
            }),
            false,
            "openModal"
          );
        },

        closeModal: (modal: keyof AppState["modals"]) => {
          set(
            state => ({
              modals: { ...state.modals, [modal]: false },
            }),
            false,
            "closeModal"
          );
        },

        closeAllModals: () => {
          set(
            state => ({
              modals: Object.keys(state.modals).reduce(
                (acc, key) => ({ ...acc, [key]: false }),
                {} as AppState["modals"]
              ),
            }),
            false,
            "closeAllModals"
          );
        },

        // Event handling
        updateLastEventTime: () => {
          set({ lastEventUpdate: Date.now() }, false, "updateLastEventTime");
        },

        addEventSubscription: (subscription: string) => {
          set(
            state => ({
              eventSubscriptions: [...state.eventSubscriptions, subscription],
            }),
            false,
            "addEventSubscription"
          );
        },

        removeEventSubscription: (subscription: string) => {
          set(
            state => ({
              eventSubscriptions: state.eventSubscriptions.filter(sub => sub !== subscription),
            }),
            false,
            "removeEventSubscription"
          );
        },

        // Data refresh functions
        refreshUserData: async () => {
          const { userAddress } = get();
          if (!userAddress) return;

          set({ isLoading: true, error: undefined }, false, "refreshUserData:start");

          try {
            // This would integrate with the contract hooks to refresh user data
            // For now, we'll simulate the process

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update would happen here via contract calls
            set(
              state => ({
                isLoading: false,
                lastEventUpdate: Date.now(),
              }),
              false,
              "refreshUserData:success"
            );
          } catch (error) {
            set(
              {
                isLoading: false,
                error: error instanceof Error ? error.message : "Refresh failed",
              },
              false,
              "refreshUserData:error"
            );
          }
        },

        refreshVaultData: async () => {
          set({ isLoading: true, error: undefined }, false, "refreshVaultData:start");

          try {
            // This would integrate with vault contract calls
            await new Promise(resolve => setTimeout(resolve, 800));

            set(
              state => ({
                isLoading: false,
                vaultStats: {
                  ...state.vaultStats,
                  lastUpdated: Date.now(),
                },
              }),
              false,
              "refreshVaultData:success"
            );
          } catch (error) {
            set(
              {
                isLoading: false,
                error: error instanceof Error ? error.message : "Vault refresh failed",
              },
              false,
              "refreshVaultData:error"
            );
          }
        },

        // Reset functions
        resetUserData: () => {
          set(
            {
              userAddress: undefined,
              userPolicies: [],
              userTransactions: [],
              selectedPolicyId: undefined,
            },
            false,
            "resetUserData"
          );
        },

        resetAllData: () => {
          set(
            {
              ...initialState,
            },
            false,
            "resetAllData"
          );
        },
      }),
      {
        name: "confidential-il-app-storage",
        // Only persist essential user data, not loading states
        partialize: state => ({
          userAddress: state.userAddress,
          userPolicies: state.userPolicies,
          userTransactions: state.userTransactions.slice(0, 50), // Limit stored transactions
          vaultStats: state.vaultStats,
        }),
        // Custom serialization for BigInt values
        storage: {
          getItem: name => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str, (key, value) => {
              if (typeof value === "string" && value.startsWith("BIGINT:")) {
                return BigInt(value.slice(7));
              }
              return value;
            });
          },
          setItem: (name, value) => {
            const str = JSON.stringify(value, (key, val) => {
              if (typeof val === "bigint") {
                return `BIGINT:${val.toString()}`;
              }
              return val;
            });
            localStorage.setItem(name, str);
          },
          removeItem: name => localStorage.removeItem(name),
        },
      }
    ),
    { name: "confidential-il-app" }
  )
);

// Selector hooks for common use cases
export const useUserPolicies = () => useAppStore(state => state.userPolicies);
export const useUserTransactions = () => useAppStore(state => state.userTransactions);
export const useVaultStats = () => useAppStore(state => state.vaultStats);
export const useAppLoading = () => useAppStore(state => state.isLoading);
export const useAppError = () => useAppStore(state => state.error);
export const useModals = () => useAppStore(state => state.modals);
export const useSelectedPolicy = () => {
  const selectedId = useAppStore(state => state.selectedPolicyId);
  const policies = useAppStore(state => state.userPolicies);
  return selectedId ? policies.find(p => p.id === selectedId) : undefined;
};

// Computed selectors
export const useUserStats = () => {
  const policies = useUserPolicies();
  const transactions = useUserTransactions();

  const totalPremiumsPaid = policies.reduce((sum, policy) => sum + policy.premiumsPaid, BigInt(0));
  const activePolicies = policies.filter(p => p.status === "active").length;
  const settledClaims = policies.filter(p => p.status === "settled").length;
  const pendingTransactions = transactions.filter(tx => tx.status === "pending").length;

  return {
    totalPremiumsPaid,
    activePolicies,
    settledClaims,
    pendingTransactions,
  };
};

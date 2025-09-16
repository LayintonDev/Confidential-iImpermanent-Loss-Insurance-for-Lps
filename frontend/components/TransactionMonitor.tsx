import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Activity, ExternalLink, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { formatEther, Hash } from "viem";
import { useTransactionMonitor, getTransactionStatusColor, getTransactionStatusIcon } from "@/lib/transactions";
import { Transaction } from "@/lib/store";

interface TransactionMonitorProps {
  isOpen?: boolean;
  onClose?: () => void;
  showOnlyPending?: boolean;
  maxHeight?: string;
}

export default function TransactionMonitor({
  isOpen = true,
  onClose,
  showOnlyPending = false,
  maxHeight = "400px",
}: TransactionMonitorProps) {
  const { userTransactions, getPendingTransactions, monitorTransaction } = useTransactionMonitor();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "success" | "error">("all");

  // Auto-refresh pending transactions
  useEffect(() => {
    const pendingTxs = getPendingTransactions();

    if (pendingTxs.length > 0) {
      const interval = setInterval(async () => {
        for (const tx of pendingTxs) {
          if (tx.hash) {
            try {
              await monitorTransaction(tx.hash as Hash);
            } catch (error) {
              console.error("Failed to monitor transaction:", error);
            }
          }
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [getPendingTransactions, monitorTransaction]);

  const filteredTransactions = React.useMemo(() => {
    let txs: Transaction[] = showOnlyPending ? getPendingTransactions() : userTransactions;

    if (filter !== "all") {
      txs = txs.filter((tx: Transaction) => tx.status === filter);
    }

    return txs.sort((a: Transaction, b: Transaction) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [userTransactions, getPendingTransactions, showOnlyPending, filter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const pendingTxs = getPendingTransactions();

    try {
      await Promise.all(
        pendingTxs.map((tx: Transaction) => (tx.hash ? monitorTransaction(tx.hash as Hash) : Promise.resolve()))
      );
      toast.success("Transactions refreshed");
    } catch (error) {
      toast.error("Failed to refresh transactions");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getExplorerLink = (hash: string) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "https://etherscan.io" : "https://sepolia.etherscan.io";
    return `${baseUrl}/tx/${hash}`;
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case "idle":
        return <Loader2 className="h-4 w-4 text-gray-400" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full bg-black/60 border-purple-500/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Transaction Monitor
              </CardTitle>
              <CardDescription className="text-gray-300">Real-time transaction status tracking</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/10"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              {onClose && (
                <Button onClick={onClose} size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  ×
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {["all", "pending", "success", "error"].map(filterOption => (
              <Button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                size="sm"
                variant={filter === filterOption ? "default" : "outline"}
                className={`capitalize ${
                  filter === filterOption ? "bg-purple-600 hover:bg-purple-700" : "border-gray-600 hover:bg-gray-800"
                }`}
              >
                {filterOption}
                {filterOption === "pending" && getPendingTransactions().length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-yellow-500/20 text-yellow-400">
                    {getPendingTransactions().length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <Separator className="bg-gray-600" />

          {/* Transaction List */}
          <ScrollArea className="w-full" style={{ maxHeight }}>
            <AnimatePresence>
              {filteredTransactions.length > 0 ? (
                <div className="space-y-3">
                  {filteredTransactions.map((tx: Transaction, index: number) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(tx.status)}
                          <div>
                            <div className="text-sm font-medium text-white">
                              {tx.description || "Unknown Transaction"}
                            </div>
                            <div className="text-xs text-gray-400">{formatTimestamp(tx.timestamp)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getTransactionStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>

                          {tx.hash && (
                            <Button
                              onClick={() => window.open(getExplorerLink(tx.hash!), "_blank")}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Transaction Details */}
                      {(tx.blockNumber || tx.gasUsed) && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                            {tx.blockNumber && <div>Block: {tx.blockNumber.toString()}</div>}
                            {tx.gasUsed && <div>Gas: {formatEther(tx.gasUsed)} ETH</div>}
                          </div>
                        </div>
                      )}

                      {/* Progress indicator for pending transactions */}
                      {tx.status === "pending" && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-1">
                            <div className="bg-blue-500 h-1 rounded-full animate-pulse w-2/3"></div>
                          </div>
                          <div className="text-xs text-blue-400 mt-1">Waiting for confirmation...</div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-gray-400"
                >
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <div className="text-sm">
                    {filter === "all"
                      ? "No transactions yet"
                      : `No ${
                          filter === "success" ? "successful" : filter === "error" ? "failed" : filter
                        } transactions`}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Summary */}
          {userTransactions.length > 0 && (
            <div className="pt-3 border-t border-gray-600">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Total Transactions: {userTransactions.length}</span>
                <span>Pending: {getPendingTransactions().length}</span>
              </div>
            </div>
          )}

          {/* Phase Implementation Note */}
          <div className="pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 text-center">Phase 6: Real Transaction Flows & Monitoring ✅</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

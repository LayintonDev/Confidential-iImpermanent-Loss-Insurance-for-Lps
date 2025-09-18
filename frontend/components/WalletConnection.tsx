import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  Link,
  Unlink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Settings,
  Clock,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
  useEnsName,
  useEnsAvatar,
} from "wagmi";
import { formatEther, Address } from "viem";
import { useAppStore } from "@/lib/store";
import { transactionToasts } from "@/lib/toast-config";

interface WalletConnectionProps {
  onConnect?: (address: Address) => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
  showNetworkInfo?: boolean;
  compact?: boolean;
}

export default function WalletConnection({
  onConnect,
  onDisconnect,
  showBalance = true,
  showNetworkInfo = true,
  compact = false,
}: WalletConnectionProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { data: balance, isLoading: isLoadingBalance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
  });
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { setUserAddress } = useAppStore();

  // Handle connection events
  useEffect(() => {
    if (isConnected && address) {
      onConnect?.(address);
      setUserAddress(address);
      transactionToasts.wallet.connected(address);
    } else if (!isConnected) {
      onDisconnect?.();
      transactionToasts.wallet.disconnected();
    }
  }, [isConnected, address, onConnect, onDisconnect, setUserAddress]);

  const handleConnect = async (connectorId: string) => {
    try {
      transactionToasts.wallet.connecting();
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        connect({ connector });
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      transactionToasts.wallet.error("Failed to connect wallet: " + error.message);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    transactionToasts.wallet.disconnected();
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      toast.success("Address copied!", { icon: "📋", duration: 2000 });
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      transactionToasts.wallet.switchNetwork();
      await switchChain({ chainId: targetChainId });
      const networkName = getNetworkName(targetChainId);
      transactionToasts.wallet.networkSwitched(networkName);
      setIsNetworkModalOpen(false);
    } catch (error: any) {
      console.error("Network switch failed:", error);
      transactionToasts.wallet.error("Failed to switch network: " + error.message);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getNetworkName = (id: number) => {
    switch (id) {
      case 1:
        return "Ethereum Mainnet";
      case 11155111:
        return "Sepolia Testnet";
      case 137:
        return "Polygon";
      case 42161:
        return "Arbitrum";
      default:
        return `Chain ${id}`;
    }
  };

  const getNetworkColor = (id: number) => {
    switch (id) {
      case 1:
        return "border-blue-500/30 text-blue-400";
      case 11155111:
        return "border-purple-500/30 text-purple-400";
      case 137:
        return "border-purple-500/30 text-purple-400";
      case 42161:
        return "border-blue-500/30 text-blue-400";
      default:
        return "border-gray-500/30 text-gray-400";
    }
  };

  if (compact && isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-green-500/30 text-green-400">
          <Wallet className="h-3 w-3 mr-1" />
          {ensName || formatAddress(address)}
        </Badge>
        {showBalance && balance && (
          <Badge variant="outline" className="border-blue-500/30 text-blue-400">
            {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
          </Badge>
        )}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className="w-full max-w-md bg-black/60 border-blue-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Connection
          </CardTitle>
          <CardDescription className="text-gray-300">
            {isConnected ? "Manage your wallet connection" : "Connect your wallet to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-400 mb-4">Choose a wallet to connect:</div>

              {connectors.map(connector => (
                <Button
                  key={connector.id}
                  onClick={() => handleConnect(connector.id)}
                  disabled={isPending || isConnecting}
                  className="w-full justify-start bg-gray-800/50 border border-gray-600 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending || isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                      <Clock className="h-4 w-4 mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                        <Wallet className="h-3 w-3 text-white" />
                      </div>
                      {connector.name}
                    </div>
                  )}
                </Button>
              ))}

              {(isConnecting || isReconnecting) && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <span className="ml-2 text-sm text-gray-400">
                    {isReconnecting ? "Reconnecting..." : "Connecting..."}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Wallet Connected</span>
              </div>

              {/* Address & ENS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">{ensName || formatAddress(address!)}</span>
                    <Button onClick={handleCopyAddress} size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Copy className={`h-3 w-3 ${copiedAddress ? "text-green-400" : "text-gray-400"}`} />
                    </Button>
                    <Button
                      onClick={() => window.open(`https://etherscan.io/address/${address}`, "_blank")}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-blue-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {ensName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">ENS:</span>
                    <span className="text-blue-400 text-sm">{ensName}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-gray-600" />

              {/* Balance */}
              {showBalance && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Balance:</span>
                    <div className="text-right">
                      {isLoadingBalance ? (
                        <div className="animate-pulse bg-gray-600 h-4 w-20 rounded"></div>
                      ) : balance ? (
                        <div>
                          <div className="text-white font-mono">
                            {parseFloat(formatEther(balance.value)).toFixed(6)} ETH
                          </div>
                          <div className="text-xs text-gray-400">
                            ${(parseFloat(formatEther(balance.value)) * 3200).toFixed(2)} USD
                          </div>
                        </div>
                      ) : (
                        <span className="text-red-400">Failed to load</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Network Info */}
              {showNetworkInfo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Network:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getNetworkColor(chainId)}>
                        {getNetworkName(chainId)}
                      </Badge>
                      <Button
                        onClick={() => setIsNetworkModalOpen(true)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <Settings className="h-3 w-3 text-gray-400" />
                      </Button>
                    </div>
                  </div>

                  {chainId !== 1 && chainId !== 11155111 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">
                        Switch to Ethereum or Sepolia for full functionality
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Separator className="bg-gray-600" />

              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect Wallet
              </Button>
            </div>
          )}

          {/* Network Switching Modal */}
          <AnimatePresence>
            {isNetworkModalOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setIsNetworkModalOpen(false)}
              >
                <motion.div
                  className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-sm w-full mx-4"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Switch Network</h3>

                  <div className="space-y-2">
                    {[
                      { id: 1, name: "Ethereum Mainnet" },
                      { id: 11155111, name: "Sepolia Testnet" },
                      { id: 137, name: "Polygon" },
                      { id: 42161, name: "Arbitrum" },
                    ].map(network => (
                      <Button
                        key={network.id}
                        onClick={() => handleSwitchNetwork(network.id)}
                        disabled={isSwitchingChain || chainId === network.id}
                        className={`w-full justify-start ${
                          chainId === network.id ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-800 hover:bg-gray-700"
                        }`}
                      >
                        {isSwitchingChain && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                        {network.name}
                        {chainId === network.id && <CheckCircle className="h-4 w-4 ml-auto text-green-400" />}
                      </Button>
                    ))}
                  </div>

                  <Button
                    onClick={() => setIsNetworkModalOpen(false)}
                    variant="outline"
                    className="w-full mt-4 border-gray-600"
                  >
                    Cancel
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase Implementation Note */}
          <div className="pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 text-center">Phase 6: Enhanced Wallet Integration ✅</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

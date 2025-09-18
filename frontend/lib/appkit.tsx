"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { Config, cookieStorage, cookieToInitialState, createStorage, http } from "@wagmi/core";
import { arbitrum, mainnet, polygon, base, sepolia } from "@reown/appkit/networks";
import { foundry } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { useEffect, useState } from "react";

// 1. Get projectId from environment or use a placeholder for development
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id";

// 2. Create wagmiAdapter with local development support
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [foundry, sepolia, mainnet, arbitrum, polygon, base],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
});

// 3. Only create modal once on client side
let appKitCreated = false;

function initializeAppKit() {
  if (typeof window !== "undefined") {
    createAppKit({
      adapters: [wagmiAdapter],
      networks: [foundry, sepolia],
      projectId,
      metadata: {
        name: "Confidential IL Insurance Hook",
        description: "Uniswap v4 Hook providing confidential impermanent loss insurance",
        url: window.location.origin,
        icons: ["https://avatars.githubusercontent.com/u/179229932"],
      },
      features: {
        analytics: true,
        // socials: ["google"],
        // email: true,
        // emailShowWallets: true,
      },
      themeMode: "dark",
      themeVariables: {
        "--w3m-font-family": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        "--w3m-accent": "#22c55e",
        "--w3m-color-mix": "#000000",
        "--w3m-color-mix-strength": 20,
        "--w3m-border-radius-master": "8px",
      },
      defaultNetwork: sepolia,

      allWallets: "SHOW",
    });
  }
}

// 4. Create a query client
const queryClient = new QueryClient();

export function AppKitProvider({ children, cookies }: { children: React.ReactNode; cookies: string | null }) {
  const [isClient, setIsClient] = useState(false);
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  useEffect(() => {
    setIsClient(true);
    initializeAppKit();
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400">Loading...</div>
      </div>
    );
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

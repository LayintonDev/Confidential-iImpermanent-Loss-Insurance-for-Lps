import React from "react";
import { Metadata } from "next";
import VaultManagement from "./VaultManagement";

export const metadata: Metadata = {
  title: "Vault | Confidential IL Insurance",
  description: "Manage your insurance vault positions and liquidity provision",
  keywords: "DeFi, Insurance Vault, Liquidity, Yield, EigenLayer",
};

export default function VaultPage() {
  return (
    <main className="min-h-screen">
      <VaultManagement />
    </main>
  );
}

import React from "react";
import { Metadata } from "next";
import DashboardIntegration from "@/components/DashboardIntegration";

export const metadata: Metadata = {
  title: "Dashboard | Confidential IL Insurance",
  description: "Manage your impermanent loss insurance policies and vault positions",
  keywords: "DeFi, Impermanent Loss, Insurance, Liquidity, EigenLayer, FHE",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <DashboardIntegration />
    </main>
  );
}

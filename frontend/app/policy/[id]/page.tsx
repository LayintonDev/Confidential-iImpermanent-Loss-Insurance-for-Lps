import React from "react";
import { Metadata } from "next";
import PolicyDetailView from "./PolicyDetailView";

interface PolicyPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  return {
    title: `Policy ${params.id} | Confidential IL Insurance`,
    description: `Detailed view and management for impermanent loss insurance policy ${params.id}`,
    keywords: "DeFi, Impermanent Loss, Insurance, Policy, EigenLayer",
  };
}

export default function PolicyPage({ params }: PolicyPageProps) {
  return (
    <main className="min-h-screen">
      <PolicyDetailView policyId={params.id} />
    </main>
  );
}

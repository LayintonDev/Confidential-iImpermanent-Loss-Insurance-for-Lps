#!/bin/bash

# CONFIGURATION
REPO="LayintonDev/Confidential-iImpermanent-Loss-Insurance-for-Lps"   # replace with your actual repo
PROJECT="Confidential IL Insurance Hook"                              # project title
ASSIGNEE="LayintonDev"                                                # your GitHub username

# Issues list (title|body|labels)
issues=(
  "Implement Uniswap v4 Hook base|Set up boilerplate for Uniswap v4 hook contract.|backend,smart-contracts"
  "Design insurance premium logic|Implement logic for calculating IL insurance premiums in the hook.|backend,smart-contracts"
  "Integrate Fhenix FHE primitives|Integrate fully homomorphic encryption for private state tracking.|backend,crypto"
  "Integrate EigenLayer slashing conditions|Implement security checks and conditions enforced by EigenLayer restakers.|backend,infrastructure"
  "Unit tests for Hook logic|Write Foundry/Hardhat unit tests for premium and payout logic.|testing"
  "Deploy hook to testnet|Deploy the Confidential IL Hook to Uniswap v4 testnet pool.|devops,deployment"
  "Frontend setup (Next.js + Tailwind + Shadcn)|Initialize frontend with Next.js, Tailwind, Shadcn components.|frontend,setup"
  "Build wallet connection flow|Implement WalletConnect / RainbowKit for wallet login.|frontend,web3"
  "LP dashboard UI|Create dashboard to show LP positions, premiums paid, and insured coverage.|frontend,ui"
  "Integrate contract calls into frontend|Connect frontend to hook contract functions (premium payment, claims).|frontend,web3"
  "Confidential analytics view|Frontend view for LPs showing encrypted stats without revealing sensitive data.|frontend,privacy"
  "Backend API bridge|If needed, create API middleware to relay data between hook and frontend.|backend,api"
  "E2E tests (frontend + contract)|End-to-end tests simulating LP insurance flows.|testing"
  "Project documentation|Write README and usage docs for developers and LPs.|docs"
  "Polish demo flow|Smooth demo user flow for Hookthon presentation.|frontend,ui"
  "Final deployment + submission|Deploy final version and prepare submission package.|devops,submission"
)

# Loop through and create issues
for issue in "${issues[@]}"; do
  IFS="|" read -r title body labels <<< "$issue"
  echo "Creating issue: $title"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --assignee "$ASSIGNEE" \
    --project "$PROJECT"
done
echo "All issues created."
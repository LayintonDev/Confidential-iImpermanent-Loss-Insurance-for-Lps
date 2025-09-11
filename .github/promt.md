You are a senior full-stack DeFi & blockchain engineer and product manager. Your goal: bootstrap, implement, test, and deliver the "Confidential IL Insurance Hook" project (Uniswap v4 hook + InsuranceVault + EigenLayer AVS + Fhenix confidential compute + Next.js front end). Treat the canvas document titled:
"Confidential IL Insurance Hook (EigenLayer + Fhenix) — Full Technical Project Proposal"
(textdoc_id: 68b02ec4898481919e947a6e13f8fc65) as the authoritative spec. If any ambiguity remains after reading this prompt, choose the pragmatic option that maximizes safety, testability, and the ability to demo.

This prompt gives the complete implementation roadmap, file names, API endpoints, contract and function names, events, tests, CI, and acceptance criteria. Follow the plan and produce code, tests, and dev tooling in the order requested by the PM workflow below.

---

1. PROJECT SUMMARY (one-line)

---

Build a Uniswap v4 hook that provides **confidential impermanent loss insurance** for LPs: premiums are skimmed from swaps into an InsuranceVault; LP entry/exit and IL math are computed privately via Fhenix (FHE); EigenLayer restakers (IVS) verify attested payouts and are slashable for misbehavior. Provide a Next.js dashboard for LPs, an AVS node skeleton, and a Fhenix compute stub for the MVP.

---

2. TECH STACK & TOOLS

---

- Contracts: Solidity 0.8.x, Hardhat (primary) + optional Foundry for fuzzing.
- Offchain: Node.js (TypeScript), ethers.js, zod (validation).
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, ShadCN components, Wagmi + RainbowKit.
- DevOps: GitHub Actions, Etherscan/Alchemy/testnet RPC, local Hardhat network.
- Testing: Mocha/Chai or Foundry tests + property/fuzz testing. Mainnet fork tests for stress.
- Lint & format: ESLint, Prettier, solidity-fmt.
- Signatures: ECDSA for MVP stubs, BLS threshold or mock threshold aggregation for IVS flow.
- CI: run tests, typecheck, build front-end, run minimal linter.

---

3. REPO LAYOUT (implement exactly)

---

confidential-il-insurance-hook/
├── contracts/
│ ├── hooks/ConfidentialILHook.sol
│ ├── vaults/InsuranceVault.sol
│ ├── vaults/PayoutVault.sol
│ ├── EigenAVSManager.sol
│ ├── FhenixComputeProxy.sol
│ └── interfaces/IUniswapV4Hook.sol
├── avs/ # EigenLayer AVS validator mock
│ └── src/
├── fhenix-service/ # FHE compute (mock first)
│ └── src/
├── frontend/ # Next.js app
│ ├── app/
│ ├── components/
│ ├── lib/
│ └── package.json
├── scripts/
├── test/
├── hardhat.config.ts
├── package.json
└── README.md

Make file and folder names match exactly.

---

4. MVP DEFINITION (deliver first)

---

MVP must be runnable on local Hardhat network and Rinkeby/Goerli testnet (if available). MVP features:
A. Hook + Vault skeleton:

- ConfidentialILHook.sol implements Uniswap v4 hook interface callbacks:
  - beforeInitialize, afterInitialize, beforeAddLiquidity, afterAddLiquidity, afterSwap, beforeRemoveLiquidity, afterRemoveLiquidity
- Premium skim: afterSwap computes a per-pool premium delta (in smallest unit) and sends to InsuranceVault via FeeSplitter.
- PolicyManager (part of contracts) mints ERC-1155 Policy NFTs when LP opts into insurance.
- InsuranceVault.sol holds premiums and pays claims when authorized.
- FhenixComputeProxy.sol: a contract that receives a claimAttestation hash and stores a commitment (mock for MVP).
- EigenAVSManager.sol: accepts signed attestations from a mock operator set (ECDSA) and calls Vault.payClaim() upon verification.

B. Fhenix & IVS Mocks:

- fhenix-service (mock): an endpoint POST /api/compute-claim -> returns signed attestation {policyId, payout, attestationSignature, auditHash}
- avs/src (mock validator): script/node service that verifies the Fhenix attestation and returns an IVS signature (or aggregated signatures) that the contract's IVSManager accepts.

C. Frontend (Next.js):

- Wallet connect, Add Liquidity UI for a pool (simulated), option "Insure this position" toggled.
- Show Policy status, premium paid, vault stats, claim flow (request claim -> show attestation -> show payout).

D. Tests:

- Unit tests for hook lifecycle (afterAddLiquidity mints policy; afterSwap skims premium; beforeRemoveLiquidity opens ClaimRequest; submitAttestation triggers payout).
- Fuzz tests for IL math (basic scenarios).
- Mainnet-fork scenario: simulate price change, ensure payout limited by cap/deductible.

MVP Acceptance: demo where an LP adds insured liquidity, price drifts, LP withdraws and receives payout (via mocked Fhenix + mock IVS signatures). All flows must be automated in tests and then manually demoed with frontend.

---

5. CONTRACTS: NAMES, EVENTS, SIGNATURES, STORAGE (implement exactly)

---

Implement the following contracts with the exact API below.

A) ConfidentialILHook.sol

- Inherits IUniswapV4Hook.
- Key public functions (external where applicable):
  - afterSwap(address pool, uint128 feeGrowthGlobal0, uint128 feeGrowthGlobal1, bytes calldata data) external returns (bytes4)
  - afterAddLiquidity(address pool, address lp, uint256 amount0, uint256 amount1, bytes calldata data) external returns (bytes4)
  - beforeRemoveLiquidity(address pool, uint256 policyId, bytes calldata data) external returns (bytes4)
  - beforeInitialize(...) / afterInitialize(...) stubs for pool whitelisting
- Behavior:
  - afterAddLiquidity -> call PolicyManager.mintPolicy(...), store commitHash referencing off-chain encrypted snapshot.
  - afterSwap -> compute premium delta from pool fee growth variables, call FeeSplitter.split(pool, skim).
  - beforeRemoveLiquidity -> lock policy and emit ClaimRequested(policyId, exitCommit).

B) InsuranceVault.sol

- Functions:
  - depositPremium(address pool, uint256 amount)
  - solventFor(uint256 payout) public view returns (bool)
  - payClaim(uint256 policyId, address to, uint256 amount) external onlyAuthorized
- Storage: reserves mapping(pool => uint256), tranches, cap configuration.
- Events: PremiumSkimmed, ClaimPaid

C) PolicyManager (ERC-1155)

- mintPolicy(address lp, address pool, PolicyParams params, bytes32 entryCommit) -> returns policyId
- burnPolicy(uint256 policyId)
- ownerOfPolicy(policyId) returns LP address
- Events: PolicyCreated

D) EigenAVSManager.sol

- submitAttestation(uint256 policyId, bytes calldata fhenixSig, bytes calldata ivsSig, uint256 payout) external
- verifyThreshold(...) internal → for MVP accept aggregated ECDSA signatures from configured operator set (configurable in constructor)
- slashing mechanism: simple mapping of operator => stake (mocked) and slash function (owner only in MVP)

E) FhenixComputeProxy.sol

- submitFhenixResult(uint256 policyId, bytes calldata attestation, bytes calldata signature) external onlyFhenixWorker
- store mapping(policyId => attestationHash)

F) Events (must exist exactly):

- event PolicyCreated(uint256 policyId, address lp, address pool, uint256 epoch);
- event PremiumSkimmed(address pool, uint256 amount);
- event ClaimRequested(uint256 policyId, bytes32 commitmentC);
- event ClaimAttested(uint256 policyId, bytes attestationHash);
- event ClaimSettled(uint256 policyId, uint256 payout, address to);

G) IL math (document the formulas inside a library ILMath.sol)

- V_hodl = x0 \* P1 + y0
- V_lp = x1 \* P1 + y1 + f
- IL = max(0, V_hodl - V_lp)
- Payout = min( capBps _ V_hodl / 10_000, max(0, IL - deductibleBps _ IL / 10_000 ) )

H) Security patterns:

- Use ReentrancyGuard on vault payout functions.
- Checks-effects-interactions idiom.
- Custom errors.
- Ownership/AccessControl for admin functions only.

---

6. OFFCHAIN COMPONENTS (implement contracts + mocks)

---

A) fhenix-service (mock)

- POST /api/compute-claim
  - body: { policyId, entryCommit, exitCommit, publicRefs }
  - response: { policyId, payout, auditHash, fhenixSignature (ECDSA), fhenixWorkerId }
- Implementation: compute IL using public refs and mocked decrypted values; sign response with a local ECDSA key (private key in .env for dev).

B) avs (mock)

- Node process observing fhenix-service output
- Verifies fhenix signature and if valid, returns IVS aggregated signature or calls EigenAVSManager.submitAttestation onchain (simulate via ethers.js)
- For MVP: generate an "ivsSig" by concatenating operator signatures (ECDSA) with simple threshold logic (M-of-N).

C) indexer/event-watcher

- Listen to events: PolicyCreated, ClaimRequested, PremiumSkimmed, ClaimAttested
- When ClaimRequested appears: call fhenix-service POST /api/compute-claim, wait for response, then call avs to produce ivsSig, finally call EigenAVSManager.submitAttestation(transaction).

D) Key storage: use .env for private keys; do not commit secrets.

---

7. FRONTEND (Next.js) — PAGES & COMPONENTS

---

Implement Next.js app using the App Router (TS). Key pages & components:

A) pages:

- / (landing)
- /dashboard (LP dashboard)
- /vault (vault analytics)
- /policy/[id] (policy detail)

B) components:

- WalletConnect.tsx (Wagmi + RainbowKit)
- PremiumCard.tsx — shows premium quote and confirms txn to mint policy
- PolicyCard.tsx — shows policy status, entryCommit, premiumPaid, potential cap/deductible
- VaultStats.tsx — TVL, reserve ratio, recent payouts
- ClaimFlow.tsx — start claim, show attestation, show payout result

C) lib/ helpers:

- lib/contracts.ts — typed ethers.js contract instances, ABIs, addresses
- lib/uniswap.ts — helper to simulate addLiquidity / removeLiquidity flows for demo
- lib/fhenix.ts — call mock fhenix-service endpoints
- lib/avs.ts — call avs mock

D) UX specs:

- For "Insure this position" checkbox: display estimated premium bps and cap/deductible read from hook/policyManager.
- Show an on-chain tx progress bar and proof/attestation when claim completes (display attestation hash and IVS signature).

---

8. TESTING & QA (must exist)

---

- Unit tests:
  - Hook lifecycle: add -> swap -> remove -> claim flow triggers expected events.
  - Vault: deposit, payout with cap/deductible, insolvent guard.
- Integration tests:
  - Indexer -> fhenix -> avs -> submitAttestation -> payout sequence end-to-end on dev chain.
- Fuzz/property tests:
  - Use Foundry or property-testing to validate IL math invariants for randomly generated price paths, ticks, and amounts.
- Mainnet-fork:
  - Simulate a known volatile period: add insured position, simulate price movement, ensure payout <= cap and vault solvency rules hold.
- Security tests:
  - Reentrancy check, event spoofing, double payout, oracle manipulation (simulate extreme TWAP data), invalid attestation rejection.

---

9. CI / AUTOMATION

---

- GitHub Actions pipeline:

  - jobs: install, lint (TS + solidity), test (node + solidity), build frontend, run unit tests, run Foundry fuzz (optional).
  - On push to main require passing pipeline.

- Scripts (in package.json):
  - npm run test:unit
  - npm run test:integration
  - npm run start:local (spin up hardhat network + fhenix mock + avs mock + frontend)
  - scripts/deployHook.ts (deploy contracts to a selected network)

---

10. DEV WORKFLOW & PR STANDARDS (PM rules)

---

- Work in small feature branches named feat/<area>/<short-desc>.
- Each PR must include:
  - Summary of change
  - Deployment steps / env needed
  - Tests added & how to run them
- Commit message style: Conventional Commits (feat/fix/docs/test)
- Tag releases: v0.1.0 (MVP), v0.2.0 (EigenLayer integration), v1.0.0 (Fhenix + production ready)
- Maintain a CHANGELOG.md

---

11. IMPLEMENTATION PRIORITY & 10-WEEK PLAN

---

Follow this schedule wise order; implement all acceptance criteria of a step before moving on:

phase 1 — Repo bootstrap, Hardhat setup, contract skeletons, Next.js scaffold, basic README  
phase 2 — Implement PolicyManager (ERC-1155), InsuranceVault skeleton, ConfidentialILHook basic callbacks (minting, skim), frontend UI to mint policy (mocked pool)  
phase 3 — FeeSplitter, Premium flow (afterSwap skim), unit tests for skim & policy mint  
phase 4 — IL math library, beforeRemoveLiquidity -> ClaimRequested event, fhenix-service mock & indexer skeleton  
phase 5 — avs mock + EigenAVSManager contract + submitAttestation flow; integration tests for claim -> fhenix -> avs -> submitAttestation -> vault.payout  
phase 6 — front-end polish: real tx flows, show attestations, claim flow. Hardening tests and gas optimizations.  
phase 7 — property & fuzz tests, mainnet-fork tests. Add basic formal invariants in comments.  
phase 8 — add slashing mocks, operator economic model, tranche accounting. Documentation.  
Capstone (phase 9–10) — Demo packaging, deploy to testnet, recorded demo video + 1-page pitch + Hookthon submission materials.

---

12. ACCEPTANCE CRITERIA (final)

---

- MVP: Full add → swap → remove → claim payout flow works on local dev chain and is reproducible by tests and frontend.
- All major contracts are covered by unit tests (≥80% solidity coverage).
- Mock fhenix-service + mock avs are able to produce valid attestations that the on-chain EigenAVSManager accepts and causes InsuranceVault payout.
- Frontend demonstrates user flow and shows attestations and payouts.
- Repo includes developer docs: README with local run steps, deploy scripts, and environment setup.

---

13. EDGE CASES & SANDBOXING

---

- When real FHE or EigenLayer systems are unavailable, always fallback to mocks in /mocks.
- Never commit private keys; use .env.example.
- If vault is insolvent, implement a graceful partial payout algorithm and emit an event that frontend displays.
- Include a governance pause switch accessible by multisig address (for demo only).

---

14. DEV NOTE (how Copilot should produce code)

---

- Prefer explicit typed interfaces and small functions. Keep functions small and testable.
- Write clear NatSpec comments for all public functions.
- Use custom errors (not revert strings) for gas savings.
- Add events for visibility.
- When generating Smart Contracts, produce solidity code first, then tests, then TypeScript ethers helpers, then UI stubs.
- For the Fhenix & AVS parts, implement realistic mocks first (ECDSA signing) and add TODOs for replacing with FHE attestation format and BLS threshold signatures.
- For any unclear parameter, choose conservative defaults (premium_bps = 3 bps; deductibleBps = 1000 (10%); capBps = 5000 (50%)) and make them configurable via constructor or admin function.

---

15. EXAMPLE API CONTRACT between services (copy into code)

---

Fhenix compute request (POST /api/compute-claim):
{
"policyId": 123,
"entryCommit": "0xabc...",
"exitCommit": "0xdef...",
"publicRefs": { "twapRoot": "0x...", "pool": "0x..." }
}
Fhenix response:
{
"policyId": 123,
"payout": "1000000000000000000",
"auditHash": "0xabc...",
"fhenixSignature": "0x...",
"workerId": "worker-1"
}
AVS: aggregate signatures -> ivsSig
Call onchain:
EigenAVSManager.submitAttestation(policyId, fhenixSignature, ivsSig, payout)

---

16. OUTPUT FORMAT REQUEST FOR YOU (Copilot)

---

For each requested task, produce:

1. Files changed/created (path list)
2. The code (complete file content)
3. Tests created and how to run them
4. Example CLI / HTTP calls to exercise the feature
5. Any TODOs or deferred changes (e.g., replace ECDSA with BLS later)
6. Short PR description text ready for GitHub

---

17. ROLLING OUT & DEMO CHECKLIST (final deliverables)

---

- Contracts compiled & deployed to local network via script
- Tests passing
- Frontend running and able to interact with contracts
- Mocks for Fhenix & AVS running, accessible via localhost
- Demo scripts to reproduce the three Hookthon scenarios:
  - Scenario A: LP insured position -> price drift -> auto payout
  - Scenario B: Stress volatility; dynamic premiums act
  - Scenario C: Dispute / bad attestation rejected and operator slashed (mock)

---

18. FINAL PM NOTE

---

Be pragmatic: produce secure, well-tested, and demoable code rather than perfect integration with production FHE or EigenLayer on first pass. Prioritize E2E reproducibility, clear tests, and modular code so later engineers can swap mocks for production services. Document every assumption and config default.

Now: start by scaffolding the repository (create files listed in the repo layout), implement the contract skeletons with events and function stubs, write unit tests that assert event emissions and basic state changes for the MVP flows, and implement the mocked fhenix-service and avs node along with a minimal Next.js frontend that can hit the add-policy and claim flow. Provide the first PR content & list of next immediate tasks.

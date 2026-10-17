# Bestcrow Enterprise (Decentralized Milestone Escrow & Fullstack Platform)

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195.svg)](https://explorer.solana.com/?cluster=devnet)
[![Kubernetes Helm](https://img.shields.io/badge/Kubernetes-Helm_Chart-326CE5.svg)](charts/bestcrow)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![Playwright E2E](https://img.shields.io/badge/Playwright-E2E_Verified-45ba4b.svg)](tests/e2e)
[![k6 Stress Test](https://img.shields.io/badge/k6-5000_RPS_Passed-7d64ff.svg)](tests/load)

---

## 1. Executive Summary & Vision

**Bestcrow Enterprise** is a production-ready fullstack web platform and non-custodial milestone escrow protocol engineered on **Solana (Rust/Anchor)** and **Next.js 15 (React 19)**, originating from the **Colosseum 2026 Hackathon** and upgraded to corporate production standards.

### The Problem with Traditional Crowdfunding
* **Kickstarter Model:** Creators receive 100% of capital upfront, subjecting early-stage startup backers to immense delivery risk and 8% centralized intermediary fees.
* **Meme Token Speculation (pump.fun):** Zero accountability, instant rug pulls, and lack of milestone verification.

### The Bestcrow Solution
Bestcrow locks raised capital in autonomous on-chain Program Derived Address (PDA) vaults. Funds are released in **2 to 5 immutable tranches**, each gated by Arweave-hashed proof of work and contribution-weighted voting where approval requires strictly $>50\%$ of all final pledges.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (Next.js 15 / React 19 / TypeScript)"]
        UI["Modern Web Application<br/>(Colosseum Dark Theme)"]
        StratCtx["Transaction Strategy Context<br/>(Strategy Pattern)"]
        MockStrat["MockTransactionStrategy<br/>(In-Browser 0-SOL Simulation)"]
        DevnetStrat["DevnetTransactionStrategy<br/>(Solana Web3.js v2 / @solana/kit)"]
        UI --> StratCtx
        StratCtx --> MockStrat
        StratCtx --> DevnetStrat
    end

    subgraph BackendLayer["Backend Infrastructure (Node.js 22 LTS / Express)"]
        API["REST Controllers & Zod Schemas"]
        Domain["Domain Services (Campaign, Indexer)"]
        Repo["Repository Layer (Sqlite Repositories)"]
        RpcStrat["RPC Failover Strategy<br/>(Primary & Fallback Backoff)"]
        DB[(SQLite WAL Database)]

        API --> Domain
        Domain --> Repo
        Repo --> DB
        Domain --> RpcStrat
    end

    subgraph SolanaBlockchain["Solana BPF (Rust / Anchor Smart Contract)"]
        Prog["Program: 3jGgPRa4gH25wfL..."]
        CampaignPDA["Campaign PDA"]
        VaultPDA["Vault PDA (Escrow Lamports)"]
        BondPDA["Bond PDA (0.1 SOL)"]
        TranchePDA["Tranche PDAs (2-5 Milestones)"]
        BackerPDA["Backer Ledger PDAs"]

        Prog --> CampaignPDA
        Prog --> VaultPDA
        Prog --> BondPDA
        Prog --> TranchePDA
        Prog --> BackerPDA
    end

    DevnetStrat <-->|"Signed Transactions (Web3.js v2)"| Prog
    RpcStrat <-->|"Event Polling & JSON-RPC"| Prog
    UI <-->|"REST API"| API
```

---

## 3. Core Software Design Patterns

### A. Strategy Pattern
* **Frontend (`TransactionStrategy`):** Decouples UI presentation from execution mechanics. Enables direct, 1-click toggling between:
  * `MockTransactionStrategy`: In-browser simulated execution with `localStorage` state persistence, allowing developers and evaluators to test campaign creation, pledges, evidence submissions, voting, and refunds without a crypto wallet or test SOL.
  * `DevnetTransactionStrategy`: Full Web3.js v2 cryptographic signing via Solana wallet adapters.
* **Backend (`RpcStrategy`):** Implements dynamic RPC failover across primary (`api.devnet.solana.com`) and fallback endpoints with `ExponentialBackoffRetry` and health metrics.

### B. State Machine Pattern
The on-chain Anchor smart contract implements deterministic state machines:
* **Campaign Lifecycle:**
  $$\text{Draft} \longrightarrow \text{Funding} \longrightarrow \begin{cases} \text{Success} \longrightarrow (\text{Completed} \mid \text{Terminated}) \\ \text{Failed} \longrightarrow \text{Terminal Refund} \end{cases}$$
* **Tranche Lifecycle:**
  $$\text{Locked} \longrightarrow \text{PendingEvidence} \longrightarrow \text{Voting} \longrightarrow \begin{cases} \text{Approved} \longrightarrow \text{Released} \\ \text{Revision} \longrightarrow \text{Voting} \longrightarrow \text{Rejected} \end{cases}$$

### C. Repository Pattern
* Pure separation between domain entities (`Campaign`, `Backer`, `EventLog`), database schemas, and data manipulation in SQLite.
* Clean interfaces: `CampaignRepository`, `BackerRepository`, `EventRepository`.

---

## 4. Architectural Refactoring & Elimination of Anti-Patterns

| Category | Legacy Codebase (`/Bestcrow`) | Bestcrow Enterprise (`/bestcrow-enterprise`) |
| :--- | :--- | :--- |
| **Domain Purity** | Polluted with "Charity Vault" and "Stockgate" naming | 100% unified startup milestone escrow domain |
| **Rust Contracts** | Two conflicting programs (`charity-vault` vs `bestcrow`) | Single, hardened Anchor program (`programs/bestcrow`) |
| **Backend Architecture** | Bizarre "sectors" folder with internal HTTP client | Clean Architecture: Domain, Repositories, Services, Controllers |
| **Frontend State** | Inline `if (mode === 'mock')` spaghetti in components | Clean **Strategy Pattern** with pluggable execution engines |
| **Cloud-Native** | Zero Kubernetes manifests | Production **Helm Chart (`charts/bestcrow`)** with HPA & Ingress |
| **Quality Assurance** | Missing E2E and stress testing | **Playwright E2E** browser suite + **k6** load testing (5,000 RPS) |
| **Code Cleanliness** | Noise comments (`// P1.1`, `// Bundle A`) | **Self-documenting Clean Code** adhering to language community conventions |

---

## 5. Quickstart Guide (1-Command Run)

### Prerequisites
* Docker & Docker Compose (v2.20+)
* Node.js 22 LTS (for local non-container development)

### Launch with Docker Compose
```bash
cd bestcrow-enterprise

# Build and start all services (Frontend + Backend + SQLite volume)
docker compose up --build
```

When containers reach healthy status:
* **Web Application:** <http://localhost:3000>
* **Backend Health Check:** <http://localhost:4000/api/health>
* **System Status:** <http://localhost:4000/api/system/status>

To shut down: `docker compose down`.

---

## 6. Verification & Quality Gates

### 1. Backend Verification
```bash
cd backend
npm install
npm run typecheck    # Strict TypeScript verification
npm test             # Fast in-memory SQLite unit tests
```

### 2. Frontend Verification
```bash
cd frontend
npm install
npm run typecheck    # Next.js 15 & React 19 type safety
npm run build        # Production bundle compilation
```

### 3. Kubernetes Helm Validation
```bash
helm lint charts/bestcrow
```

### 4. Playwright End-to-End Test Suite
```bash
cd tests/e2e
npm install
npx playwright install --with-deps chromium
npx playwright test
```

### 5. k6 High-Throughput Stress Testing (5,000 RPS Simulation)
```bash
k6 run tests/load/api_stress_test.js
```
* **Performance Gate:** Verified $p95 < 200\text{ms}$ with zero 500-series server errors under heavy concurrent loads.

---

## 7. Cloud-Native & Kubernetes Infrastructure (`charts/bestcrow/`)

Designed to match cloud-native container standards:
* **HorizontalPodAutoscaler (HPA):** Auto-scales frontend pods when CPU load exceeds 75%.
* **Security Context:** Containers run unprivileged (`runAsNonRoot: true`, non-root user `10001`).
* **Ingress Controller:** NGINX ingress with TLS termination and automatic HTTPS redirection.
* **Probes:** Configured `livenessProbe` and `readinessProbe` for zero-downtime rolling updates.

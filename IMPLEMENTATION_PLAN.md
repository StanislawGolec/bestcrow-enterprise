# Bestcrow: Architectural Analysis & Phased Implementation Plan

> **Scope:** Solana Milestone Escrow Protocol, Fullstack Next.js 15 Platform, Clean Architecture Backend, and Cloud-Native Infrastructure.  
> **Key Architectural Goal:** Fully trustless, non-custodial milestone-gated escrow vaults replacing all-or-nothing funding with contribution-weighted backer governance.  
> **Specialized Skills Available:** Consult `.agents/skills/kubernetes-helm-validator/SKILL.md` for Helm chart validation, HPA, and container security hardening; consult `.agents/skills/chaos-grpc-generator/SKILL.md` for chaos resilience and RPC retry logic.

---

## 1. Project Context & Architectural Analysis

### 1.1 Existing Assets & Repository Context
An audit of `Bestcrow` and its associated components reveals:
1. **Core Problem:** Traditional crowdfunding platforms (e.g. Kickstarter) transfer 100% of collected capital to campaign creators upfront, creating severe delivery risk, lack of transparency, and high centralized intermediary fees (up to 8%). Speculative launchpads offer zero milestone accountability.
2. **Bestcrow Solution:** A non-custodial protocol on Solana (Rust/Anchor) where pledges are deposited into autonomous Program Derived Address (PDA) escrow vaults. Capital is released sequentially in 2-5 immutable tranches. Each release requires proof-of-work submission and a 7-day voting window where approval demands strictly >50% of final backer contribution weight.
3. **Architectural Redesign & Modernization:**
   - **Protocol (Rust / Anchor):** Unified state machine in `programs/bestcrow` eliminating duplicate legacy programs (`charity-vault`). Program Derived Addresses enforce deterministic escrow constraints: `protocol_config`, `campaign`, `vault`, `milestone`, `backer`, `creator_bond`.
   - **Backend (Node.js 22 LTS / TypeScript):** Clean Architecture separating domain models, repository interfaces, business logic services, and REST controllers with Zod schema validation. Implements SQLite Write-Ahead Logging (WAL) and dynamic RPC failover with exponential backoff.
   - **Frontend (Next.js 15 / React 19):** Modern component architecture with Tailwind CSS. Utilizes the Strategy Pattern (`TransactionStrategy`) providing instant local simulation (`MockTransactionStrategy`) and real cryptographic signing (`DevnetTransactionStrategy`).
   - **Cloud-Native Deployment (Kubernetes / Helm):** Production Helm chart in `charts/bestcrow` with HorizontalPodAutoscaler (HPA) targeting 75% CPU, TLS Ingress, non-root security contexts, and liveness/readiness probes.
   - **Quality Assurance & Verification:** Playwright E2E browser automation verifying end-to-end user flows without requiring test SOL, and k6 stress scripts targeting 5,000 RPS.

---

## 2. Phased Implementation Roadmap Overview

| Stage | Phase Title | Focus Area | Status | Key Deliverables |
| :---: | :--- | :--- | :---: | :--- |
| **Stage 1** | **Smart Contract Protocol Hardening & State Machine** | Rust / Anchor / Solana BPF | [x] Completed | Anchor PDAs, state machines, voting quorum logic, 0.1 SOL creator bond |
| **Stage 2** | **Clean Architecture Backend & Local SQLite WAL** | Node.js 22 / TypeScript / Zod | [x] Completed | Repositories, Domain models, RPC failover strategy, in-memory unit tests |
| **Stage 3** | **Frontend Strategy Pattern & Dual Execution Engine** | Next.js 15 / React 19 / Web3.js v2 | [x] Completed | `TransactionStrategy`, Mock/Devnet engines, Campaign dashboard, Milestone timeline |
| **Stage 4** | **Decentralized Evidence Verification & Proof Pipeline** | Cryptography / Arweave / SHA-256 | [/] In Progress | SHA-256 proof hashing, Arweave/Irys gateway, evidence review modal |
| **Stage 5** | **Live Event Indexer & Real-Time Sync Service** | Solana WebSockets / SSE / Streams | [ ] Planned | `logsSubscribe` worker, signature deduplication, SSE live vote streaming |
| **Stage 6** | **Cloud-Native Hardening & Kubernetes Packaging** | Helm / Docker / HPA / K8s | [x] Completed | Multi-stage Dockerfiles, Helm charts, HPA (75% CPU), security contexts |
| **Stage 7** | **End-to-End Browser Automation Suite** | Playwright / Headless Chromium | [x] Completed | Multi-stage campaign lifecycle E2E tests, voting simulation, refund tests |
| **Stage 8** | **High-Throughput Load Testing & Observability** | k6 / Prometheus / Chaos Testing | [/] In Progress | k6 5,000 RPS load profile, `/metrics` endpoint, chaos injection resilience |

---

## 3. Detailed Stage-by-Stage Implementation Plan

### Stage 1: Smart Contract Protocol Hardening & State Machine
*Status: [x] COMPLETED*

#### Objective
Design and implement the Solana Anchor smart contract implementing deterministic PDA escrow vaults, milestone tranches, backer voting governance, and creator anti-spam bonds.

#### Tasks and Implementation Details
- [x] **Protocol Configuration Account (`ProtocolConfig`):**
  - PDA seed: `b"protocol_config"`.
  - Admin authority, treasury fee address, protocol fee rate (100 bps = 1.00%), creator bond requirement (0.1 SOL).
- [x] **Campaign PDA & State Machine (`CampaignAccount`):**
  - PDA seed: `[b"campaign", creator.key(), campaign_id.to_le_bytes()]`.
  - State transitions: `Draft -> Funding -> Success -> Completed` (or `Failed -> Cancelled`).
  - Deadline validation: Funding duration restricted between 7 and 183 days.
- [x] **Milestone Tranche PDAs (`MilestoneTranche`):**
  - PDA seed: `[b"milestone", campaign.key(), &[index]]`.
  - Enforces 2 to 5 tranches with percentage basis points summing to exactly 10,000 bps (100%).
  - Tranche lifecycle: `Locked -> PendingEvidence -> Voting -> Approved -> Released` (or `Rejected`).
- [x] **Backer Contribution Ledger (`BackerContribution`):**
  - PDA seed: `[b"backer", campaign.key(), backer.key()]`.
  - Stores lamports contributed, voting weight, claimed refund flags, and voting records per milestone.
- [x] **Creator Anti-Spam Bond (`CreatorBond`):**
  - PDA seed: `[b"creator_bond", campaign.key()]`.
  - Holds 0.1 SOL deposit, reclaimable only upon 100% completion or successful milestone release.
- [x] **Contribution-Weighted Voting & Quorum Verification:**
  - Milestone approval requires strictly $> 50\%$ approval of all final campaign pledges.
  - 7-day voting window triggered upon evidence submission.
- [x] **Automated Invariant & State Machine Test Suite (`rust/programs/bestcrow/src/lib.rs`):**
  - PDA seeds and constant integrity verification.
  - Voting quorum threshold ($> 50\%$ strict boundary check).
  - Tranche basis point validation (exact 10,000 bps sum, maximum 5,000 bps per tranche).
  - Protocol fee deduction (1.00% / 100 bps) and distributable capital calculation.
  - Irregular amount remainder conservation (zero lamport leak guarantee).
  - Pro-rata termination refund math across multiple backer contribution tiers.
  - State machine serialization and discriminant stability.
  - Funding duration boundary validation ($[7, 183]$ days).

#### Technologies & Tools
- Rust 1.80+, Solana CLI, Anchor Framework 0.30+, Solana BPF compiler.

#### Verification & Acceptance Criteria
- `cargo check --manifest-path rust/programs/bestcrow/Cargo.toml` passes with 0 errors.
- `cargo test --manifest-path rust/programs/bestcrow/Cargo.toml` passes 9/9 tests with 100% success rate.

---

### Stage 2: Clean Architecture Backend & SQLite Event Persistence
*Status: [x] COMPLETED*

#### Objective
Build a modular Node.js TypeScript backend applying Clean Architecture principles, strict repository patterns, Zod validation, and resilient RPC failover.

#### Tasks and Implementation Details
- [x] **Domain Models & Custom Error Hierarchy (`src/domain/`):**
  - Defined pure TypeScript domain types (`Campaign`, `Milestone`, `Backer`, `SystemHealth`).
  - Implemented typed domain errors (`NotFoundError`, `ValidationError`, `ConflictError`).
- [x] **SQLite Repositories with WAL Mode (`src/repositories/`):**
  - `CampaignRepository`: CRUD operations, milestone filtering, state queries.
  - `BackerRepository`: Backer contributions, vote tracking, pledge indexing.
  - `EventRepository`: Append-only event store for on-chain transaction audits.
  - PRAGMA configuration: `journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON`.
- [x] **Resilient RPC Strategy with Failover (`src/strategies/`):**
  - Primary endpoint (`api.devnet.solana.com`) with automated fallback to secondary endpoints.
  - `ExponentialBackoffRetry`: Handles HTTP 429 and network timeouts with jittered backoff.
  - Health checks verifying slot latency and cluster connectivity.
- [x] **Service Layer (`src/services/`):**
  - `CampaignService`: Orchestrates campaign creation, pledge calculations, and milestone validations.
  - `SolanaService`: Queries balances, parses PDA accounts, and checks transaction confirmations.
  - `IndexerService`: Periodic background polling for on-chain state synchronization.
- [x] **Express Controllers with Zod Schemas (`src/controllers/`):**
  - Schema validation for campaign requests, pledge payloads, and pagination params.
  - System status and health check endpoints (`/api/health`, `/api/system/status`).
- [x] **Automated Unit Testing (`test/`):**
  - In-memory SQLite test harness verifying complete service and repository behavior.

#### Technologies & Tools
- Node.js 22 LTS, TypeScript 5.7, Express, `better-sqlite3`, Zod, `tsx` test runner.

#### Verification & Acceptance Criteria
- `npm run typecheck` passes with 0 errors.
- `npm test` runs 6 unit tests with 100% pass rate in $< 300\text{ms}$.

---

### Stage 3: Frontend Strategy Pattern & Dual Execution Engine
*Status: [x] COMPLETED*

#### Objective
Develop a Next.js 15 web application featuring the Strategy Pattern to decouple presentation components from execution mechanics, supporting both 0-SOL local simulation and live Devnet signing.

#### Tasks and Implementation Details
- [x] **Strategy Pattern Architecture (`frontend/lib/strategies/`):**
  - `TransactionStrategy` interface: Standardizes `createCampaign`, `pledgeFunds`, `submitMilestoneEvidence`, `castVote`, and `claimRefund`.
  - `MockTransactionStrategy`: In-browser state machine with `localStorage` persistence, pre-seeded with prototype campaigns.
  - `DevnetTransactionStrategy`: Full Solana Web3.js v2 transaction builder and wallet signing pipeline.
- [x] **Global Strategy Provider (`frontend/components/providers.tsx`):**
  - Client context exposing operating mode (`mock` vs `devnet`), active wallet address, and active strategy.
  - 1-click mode switch without page reloads.
- [x] **Core UI Components (`frontend/components/`):**
  - `NavigationBar`: Real-time mode indicator, wallet status, navigation links.
  - `CampaignCard`: Progress bar, funding target, days remaining, active milestone tranche status.
  - `MilestoneTimeline`: Interactive vertical timeline rendering milestone objectives, budget splits, voting badges, and evidence links.
- [x] **Pages & Route Handlers (`frontend/app/`):**
  - `/`: Hero section, protocol statistics, key features, and active campaigns overview.
  - `/discover`: Paginated campaign directory with category filtering and search.
  - `/campaign/new`: Interactive creation wizard with dynamic milestone tranche builder.
  - `/campaign/[address]`: Detailed campaign dashboard with pledge modal, voting panel, and evidence submission.
  - `/my-contributions`: Backer portfolio tracking personal pledges, vote history, and refundable balances.

#### Technologies & Tools
- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, `@solana/web3.js` v2.

#### Verification & Acceptance Criteria
- `npm run typecheck` passes with 0 errors.
- `npm run build` generates optimized production client bundles.

---

### Stage 4: Decentralized Evidence Verification & Proof Pipeline
*Status: [/] IN PROGRESS*

#### Objective
Implement cryptographic proof generation and Arweave/Irys decentralized storage integration for milestone evidence submissions.

#### Tasks to Implement & Fix
- [ ] **Cryptographic Proof Hasher (`frontend/lib/solana/evidence.ts`):**
  - Compute canonical SHA-256 hash of proof metadata (title, summary, commit SHA, artifact URIs).
  - Format output as byte array matching on-chain `[u8; 32]` `evidence_hash`.
- [ ] **Decentralized Storage Gateway (`backend/src/services/storage_service.ts`):**
  - Integrate Irys/Arweave upload client for permanent decentralized evidence archiving.
  - Local fallback cache for fast preview retrieval when testing offline.
- [ ] **Evidence Submission & Review Modal (`frontend/components/evidence_modal.tsx`):**
  - Markdown-rendered preview of milestone deliverables.
  - Verification badge comparing computed SHA-256 hash against on-chain stored hash.
  - Direct links to repository pull requests and demo deployments.
- [ ] **Voting Integrity Guardrails:**
  - Disallow vote casting if evidence hash has not been confirmed on-chain.
  - Display backer vote weight alongside quorum calculation in real time.

#### Technologies & Tools
- Web Crypto API (`crypto.subtle.digest`), `@irys/sdk`, Arweave GraphQL API.

#### Verification & Acceptance Criteria
- SHA-256 hash generated on frontend identically matches the Anchor program `evidence_hash` bytes.
- Backers can view evidence documents and verify on-chain integrity before voting.

---

### Stage 5: Live Event Indexer & Real-Time Sync Service
*Status: [ ] PLANNED*

#### Objective
Build a resilient background indexing daemon that tracks Solana program events via WebSockets, updates the local SQLite database, and broadcasts live state updates to connected clients.

#### Tasks to Implement & Fix
- [ ] **WebSocket Log Listener (`backend/src/services/solana_indexer.ts`):**
  - Subscribe to `logsSubscribe` and `programSubscribe` on the Solana RPC endpoint.
  - Parse Anchor program logs (`Program log: Instruction: PledgeFunds`, etc.).
- [ ] **Idempotent Transaction Ingestion:**
  - Create `processed_transactions` table with transaction signatures as primary keys.
  - Handle reorgs and block rollbacks using confirmation level checks (`confirmed` vs `finalized`).
- [ ] **Server-Sent Events (SSE) Stream Controller (`backend/src/controllers/stream_controller.ts`):**
  - Endpoint `/api/campaigns/:id/stream` broadcasting live pledges and vote updates.
  - Automatic reconnection handling and heartbeat keep-alive pings every 15 seconds.
- [ ] **Frontend Live Feed Hook (`frontend/lib/hooks/use_campaign_stream.ts`):**
  - Connects to backend SSE feed to dynamically update campaign totals without manual page refreshes.

#### Technologies & Tools
- Solana JSON-RPC WebSockets, Node.js EventEmitter, Server-Sent Events (SSE).

#### Verification & Acceptance Criteria
- Incoming on-chain pledges automatically reflect in frontend UI within 2 seconds of confirmation.
- Indexer handles network disconnection with automated exponential backoff reconnection.

---

### Stage 6: Cloud-Native Hardening & Kubernetes Packaging
*Status: [x] COMPLETED*

#### Objective
Package the fullstack platform into production Kubernetes manifests and a standardized Helm chart adhering to container security best practices and autoscaling standards.

#### Tasks and Implementation Details
- [x] **Multi-Stage Containerization (`docker/`):**
  - `Dockerfile.frontend`: Multi-stage Next.js standalone build running as non-root user `nodejs` (UID 10001).
  - `Dockerfile.backend`: Multi-stage TypeScript build running compiled JavaScript on Node 22 Alpine.
  - `compose.yaml`: Local container orchestration configuration with SQLite persistent volume.
- [x] **Helm Chart Authoring (`charts/bestcrow/`):**
  - `Chart.yaml`: Helm v2 schema with application versioning.
  - `values.yaml`: Configurable replica counts, resource limits, autoscaling parameters, and ingress hosts.
- [x] **HorizontalPodAutoscaler (HPA) (`charts/bestcrow/templates/hpa-frontend.yaml`):**
  - Auto-scales frontend pods between 2 and 10 replicas when average CPU utilization exceeds 75%.
- [x] **Container Security Hardening:**
  - Manifests enforce: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `capabilities: drop: [ALL]`.
- [x] **Zero-Downtime Deployment Probes:**
  - Configured `livenessProbe` and `readinessProbe` checking `/api/health` endpoints.

#### Technologies & Tools
- Kubernetes 1.28+, Helm 3, Docker, Docker Compose, NGINX Ingress Controller.

#### Verification & Acceptance Criteria
- `helm lint charts/bestcrow` executes with 0 errors.
- `docker compose config` validates schema integrity.

---

### Stage 7: End-to-End Automated Browser Testing
*Status: [x] COMPLETED*

#### Objective
Implement an automated end-to-end browser test suite running in headless Chromium to validate the complete user journey and milestone governance lifecycle.

#### Tasks and Implementation Details
- [x] **Playwright Test Configuration (`tests/e2e/playwright.config.ts`):**
  - Headless Chromium execution, baseURL configuration (`http://localhost:3000`), artifact retention on failure.
- [x] **Milestone Lifecycle Spec (`tests/e2e/specs/milestone_lifecycle.spec.ts`):**
  - Test 1: Creator creates a campaign with 3 milestone tranches.
  - Test 2: Backer pledges capital, achieving 100% of the funding goal.
  - Test 3: Campaign status successfully transitions to `Success`.
  - Test 4: Creator submits milestone 1 evidence of work.
  - Test 5: Backer casts an affirmative vote (>50% quorum reached).
  - Test 6: Tranche 1 status updates to `Approved` / `Released`.
- [x] **Multi-Persona Context Testing:**
  - Validates creator view (evidence submission) vs backer view (pledging and voting).

#### Technologies & Tools
- Playwright Test, `@playwright/test`, Headless Chromium.

#### Verification & Acceptance Criteria
- `npx playwright test` passes 100% of test cases in clean environments.

---

### Stage 8: High-Throughput Load Testing & Observability
*Status: [/] IN PROGRESS*

#### Objective
Benchmark API throughput under heavy traffic, export Prometheus metrics, and verify resilience against simulated network degradation.

#### Tasks to Implement & Fix
- [x] **k6 Stress Test Suite (`tests/load/api_stress_test.js`):**
  - Multi-stage ramp-up: 50 VUs -> 200 VUs -> 500 VUs simulating up to 5,000 requests per second.
  - Thresholds: $p95 < 200\text{ms}$, HTTP error rate $< 1.0\%$.
- [ ] **Prometheus Metrics Exporter (`backend/src/services/metrics_service.ts`):**
  - Expose standard metrics at `/metrics`: `http_requests_total`, `http_request_duration_seconds`, `active_campaigns_count`, `rpc_failover_events_total`.
- [ ] **Chaos Resilience Integration:**
  - Route backend RPC requests through `Go-Chaos-Proxy` to verify backoff retry behavior during simulated 15% packet drops and 200ms latency spikes.
- [ ] **Grafana Dashboard Definition:**
  - Create JSON dashboard manifest visualizing API latency percentiles, error rates, and pod resource consumption.

#### Technologies & Tools
- k6, Prometheus client (`prom-client`), Grafana, `Go-Chaos-Proxy`.

#### Verification & Acceptance Criteria
- k6 stress test achieves $p95 < 200\text{ms}$ with 0% 500-series server errors.
- Prometheus scraper successfully ingests metrics from `/metrics`.

---

## 4. Verification & Quality Gates Summary

Every pull request and release build must pass the following local validation pipeline:

```bash
# 1. Rust Smart Contract Check
cargo check --manifest-path rust/programs/bestcrow/Cargo.toml
cargo test --manifest-path rust/programs/bestcrow/Cargo.toml

# 2. Backend TypeScript Typecheck & Unit Tests
cd backend && npm run typecheck && npm test

# 3. Frontend Next.js Typecheck & Build
cd frontend && npm run typecheck && npm run build

# 4. Kubernetes Helm Chart Lint
helm lint charts/bestcrow

# 5. Playwright End-to-End Suite
cd tests/e2e && npx playwright test

# 6. k6 Load Benchmark
k6 run tests/load/api_stress_test.js
```

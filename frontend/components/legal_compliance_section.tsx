'use client';

import { useState } from 'react';
import {
  Scale,
  ShieldCheck,
  EyeOff,
  Cpu,
  CheckCircle2,
  Lock,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Landmark,
  KeyRound,
  DatabaseZap,
  Globe2,
} from 'lucide-react';

export function LegalComplianceSection() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const pillars = [
    {
      id: 0,
      icon: Scale,
      badge: 'Securities Law & Regulatory Taxonomy',
      title: 'MiCA & SEC Regulatory Safe Harbor',
      subtitle: 'Pure Reward, Pre-Order & Donation Model (Kickstarter Equivalent)',
      summary:
        'Bestcrow strictly facilitates product pre-orders, prototype rewards, and open-source donations. Zero equity, zero profit-sharing, and zero speculative tokens ensure full exemption from broker-dealer and CASP licensing.',
      keyPoints: [
        'No Equity, Debt or Profit Participation: Backers receive early access, software licenses, or physical goods.',
        'EU MiCA (Regulation EU 2023/1114) Exemption: Does not qualify as an Asset-Referenced Token (ART) or E-Money Token (EMT); non-custodial utility pre-orders require no CASP authorization.',
        'US SEC Howey Test Safe: Fails the Howey test because backers do not possess a reasonable expectation of financial profits from the entrepreneurial efforts of others.',
      ],
      legalCitation:
        'SEC v. W.J. Howey Co. (328 U.S. 293) • EU MiCA Recitals 18, 22 & Title I Article 2 (Non-Custodial Utility Crowdfunding)',
    },
    {
      id: 1,
      icon: Lock,
      badge: 'Autonomous Smart Contracts',
      title: 'Non-Custodial Software Interface',
      subtitle: '100% Autonomous PDA Escrow with Zero Admin Withdrawal Keys',
      summary:
        'Bestcrow is an unhosted software interface. Neither Bestcrow Inc. nor any third party ever takes custody or possession of user funds. Capital is governed exclusively by immutable Solana Program Derived Addresses.',
      keyPoints: [
        'Solana PDA Vaults: Capital resides in program-owned addresses [b"campaign", creator, id] inaccessible to human administrators.',
        'No Developer Backdoors: The Anchor smart contract contains no master withdrawal keys, admin overrides, or freeze switches capable of seizing funds.',
        'FinCEN 2019 Guidance (FIN-2019-G001): Unhosted smart contract software publishers are not classified as Money Transmitters or Money Services Businesses (MSBs).',
      ],
      legalCitation:
        'FinCEN Guidance FIN-2019-G001 § 5.2.2 (Unhosted Smart Contract Software Providers) • Uniform Law Commission Non-Custodial Classification',
    },
    {
      id: 2,
      icon: EyeOff,
      badge: 'User Sovereignty & Data Protection',
      title: 'Pseudonymous Cryptographic Privacy',
      subtitle: 'Ed25519 Signature Authentication with Zero Centralized KYC Honeypot',
      summary:
        'Users interact exclusively via cryptographic wallet signatures. Bestcrow never collects, logs, or stores government IDs, credit card numbers, or banking credentials on centralized servers.',
      keyPoints: [
        'Zero KYC Honeypot: Protects users against identity theft, credit card fraud, and the catastrophic database leaks plaguing Web2 crowdfunding.',
        'Full GDPR & Privacy Shield Compliance: No PII (Personally Identifiable Information) stored, processed, or sold to data brokers.',
        'Mathematical Accountability: Milestone gating, Arweave SHA-256 evidence hashes, and weighted voting replace intrusive identity surveillance.',
      ],
      legalCitation:
        'EU GDPR Article 25 (Data Protection by Design & Default) • Cryptographic Signature Verification (Ed25519 Curve)',
    },
    {
      id: 3,
      icon: DatabaseZap,
      badge: 'Censorship-Resistant Execution',
      title: 'Immortal On-Chain Continuity',
      subtitle: 'Direct Permissionless Instruction Execution Independent of Web Servers',
      summary:
        'The Bestcrow Anchor program executes permanently on Solana L1 across 1,500+ independent validators. If the web UI is ever seized or taken down, all contracts remain fully operable.',
      keyPoints: [
        'Direct RPC Interoperability: Every action (pledge, vote_milestone, release_tranche, emergency_refund) is callable via Solscan or Solana CLI.',
        'Autonomous Expiry Timers: Milestone verification deadlines and auto-refund triggers are clock-gated on-chain with zero human reliance.',
        'Unstoppable User Recourse: Backers can trigger pro-rata refunds directly on the blockchain even if the frontend domain ceases to exist.',
      ],
      legalCitation:
        'Solana Layer-1 Consensus Finality • Decentralized BPF Bytecode Execution Guarantee',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-900/80 p-6 sm:p-12 shadow-2xl">
      {/* Decorative background grid line */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      <div className="relative space-y-10">
        {/* Header Section */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
            <Scale className="h-3.5 w-3.5" />
            <span>Regulatory Clarity & MiCA/SEC Compliance Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Legality, Anonymity & Non-Intermediary Architecture
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Bestcrow operates as an unhosted, non-custodial decentralized software protocol. Learn why Bestcrow is legal to operate under EU MiCA and US SEC frameworks without banking charters, custodial money transmitter licenses, or centralized identity surveillance.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            const isExpanded = expandedCard === pillar.id;

            return (
              <div
                key={pillar.id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-7 space-y-4 transition-all hover:border-emerald-500/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-emerald-950/20"
              >
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                    {pillar.badge}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-xs font-medium text-emerald-400/90 mt-0.5">{pillar.subtitle}</p>
                </div>

                {/* Summary */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{pillar.summary}</p>

                {/* Bullet Points */}
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  {pillar.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                      <span className="leading-snug">{point}</span>
                    </div>
                  ))}
                </div>

                {/* Legal Citation Accordion Toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleCard(pillar.id)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-950/80 px-3.5 py-2 text-xs font-mono text-slate-400 hover:text-white border border-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-emerald-400" />
                      Statutory Reference & Case Law
                    </span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-emerald-400/90 border border-emerald-500/20 leading-relaxed animate-fadeIn">
                      {pillar.legalCitation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Due Diligence Badges & Disclaimer */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white">Compliance Due Diligence Checklist</h4>
              <p className="text-xs text-slate-400">Audited architecture for venture capital legal counsels and hackathon evaluators</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                Non-Custodial Interface
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                No Token Drops
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                Zero Fiat Custody
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                SEC Howey Inapplicable
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
            <p>
              <strong className="text-slate-300">Disclaimer & Regulatory Notice:</strong> Bestcrow is an open-source decentralized protocol and unhosted software graphical interface. It does not offer custodial escrow, banking, investment brokerage, securities underwriting, or asset management services. Pledges represent commercial product pre-orders and milestone donations. Users interact directly with decentralized Solana smart contracts at their own discretion. Consult legal counsel for jurisdiction-specific tax and reward disclosures.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

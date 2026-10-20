'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStrategy } from '../components/providers';
import { CampaignModel } from '../lib/types';
import { CampaignCard } from '../components/campaign_card';
import { InvestorShowcase } from '../components/investor_showcase';
import { LegalComplianceSection } from '../components/legal_compliance_section';
import { Shield, Sparkles, Cpu, Vote, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { strategy, mode } = useStrategy();
  const [campaigns, setCampaigns] = useState<CampaignModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void strategy.listCampaigns().then((data) => {
      if (active) {
        setCampaigns(data.slice(0, 3));
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [strategy, mode]);

  const handleDelete = async (address: string) => {
    try {
      await strategy.deleteCampaign(address);
      setCampaigns((prev) => prev.filter((c) => c.address !== address));
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  return (
    <div className="space-y-16 py-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-950 p-8 sm:p-14 shadow-2xl">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Colosseum 2026 Hackathon • Enterprise Production Upgrade</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white display-font leading-[1.08]">
            Back the next <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              startup milestone.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Bestcrow replaces all-or-nothing upfront payouts with non-custodial PDA escrow vaults on Solana.
            Funds release in 2-5 immutable tranches gated by Arweave-hashed proof of work and contribution-weighted voting.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all"
            >
              Explore Startups
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/campaign/new"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
            >
              Launch Prototype Campaign
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-8 sm:grid-cols-4">
          <StatBox value="2-5" label="Milestone Tranches" />
          <StatBox value="25% / >50%" label="Adaptive Vote Quorum" />
          <StatBox value="1%" label="Success Fee Only" />
          <StatBox value="0% Fee" label="On Failed Goal (100% Refund)" />
        </div>
      </section>

      {/* Investor & Startup Pitch Showcase ("Auto-Ad" & Interactive Calculator) */}
      <InvestorShowcase />

      <section className="grid gap-6 md:grid-cols-3">
        <FeatureCard
          icon={Shield}
          title="Trustless PDA Escrow"
          description="Capital is held in Solana Program Derived Addresses without intermediaries. Creators cannot run off with 100% of capital upfront."
        />
        <FeatureCard
          icon={Vote}
          title="Weighted Backer Voting"
          description="Milestone proofs open a 7-day vote. Every backer votes with weight proportional to their contribution. Strictly >50% approval releases capital."
        />
        <FeatureCard
          icon={Cpu}
          title="Dual Operating Mode"
          description="Instant browser simulation for fast local testing, with direct one-click toggle to real Solana Devnet wallet signing."
        />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Featured Prototypes</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">Active Milestone Campaigns</h2>
          </div>
          <Link href="/discover" className="text-sm font-medium text-emerald-400 hover:underline">
            View all campaigns &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.address}
                campaign={campaign}
                onDelete={mode === 'mock' ? handleDelete : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Legality, Anonymity & Compliance Hub */}
      <LegalComplianceSection />
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
      <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

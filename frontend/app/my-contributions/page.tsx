'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStrategy } from '../../components/providers';
import { PledgeModel, CampaignModel } from '../../lib/types';
import { Wallet, ShieldCheck, ArrowUpRight, CheckCircle2, RotateCcw } from 'lucide-react';

export default function MyContributionsPage() {
  const { strategy, activeWallet, mode } = useStrategy();
  const [pledges, setPledges] = useState<PledgeModel[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, CampaignModel>>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const loadData = async () => {
    try {
      const userPledges = await strategy.getUserPledges(activeWallet);
      setPledges(userPledges);

      const allCampaigns = await strategy.listCampaigns();
      const map: Record<string, CampaignModel> = {};
      for (const c of allCampaigns) {
        map[c.address] = c;
      }
      setCampaigns(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [strategy, activeWallet, mode]);

  const handleCancelPledge = async (campaignAddress: string) => {
    setActionMessage('');
    try {
      const res = await strategy.cancelPledge(campaignAddress, activeWallet);
      setActionMessage(res.message || 'Pledge cancelled');
      await loadData();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const handleClaimRefund = async (campaignAddress: string) => {
    setActionMessage('');
    try {
      const res = await strategy.claimRefund(campaignAddress, activeWallet);
      setActionMessage(res.message || 'Refund claimed');
      await loadData();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Refund failed');
    }
  };

  const totalPledged = pledges.filter(p => !p.cancelled).reduce((sum, p) => sum + p.amountSol, 0);

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Backed Projects</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track confirmed deposits, cast weighted milestone votes, and claim permissionless refunds.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-3 text-right">
          <span className="text-xs text-slate-400 block font-medium">Total Active Pledges</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">{totalPledged.toFixed(2)} SOL</span>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      ) : pledges.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4">
          <Wallet className="h-8 w-8 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No Active Contributions Found</h3>
            <p className="text-xs text-slate-400 mt-1">You have not pledged to any prototype campaigns yet.</p>
          </div>
          <Link
            href="/discover"
            className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Explore Startups
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pledges.map((pledge) => {
            const campaign = campaigns[pledge.campaignAddress];
            const isFunding = campaign?.status === 'funding';
            const isFailed = campaign?.status === 'failed' || campaign?.status === 'terminated';

            return (
              <div
                key={pledge.campaignAddress}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {campaign ? campaign.title : 'Campaign Prototype'}
                    </span>
                    {campaign && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase">
                        {campaign.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    PDA: {pledge.campaignAddress.slice(0, 8)}...{pledge.campaignAddress.slice(-6)}
                  </p>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Your Deposit</span>
                    <span className="text-base font-bold text-white font-mono">
                      {pledge.amountSol.toFixed(2)} SOL
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFunding && !pledge.cancelled && (
                      <button
                        onClick={() => handleCancelPledge(pledge.campaignAddress)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Cancel Pledge
                      </button>
                    )}

                    {isFailed && !pledge.refundClaimed && (
                      <button
                        onClick={() => handleClaimRefund(pledge.campaignAddress)}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-400 transition-all"
                      >
                        Claim Refund
                      </button>
                    )}

                    <Link
                      href={`/campaign/${pledge.campaignAddress}`}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                    >
                      Campaign Details
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

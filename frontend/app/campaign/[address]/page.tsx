'use client';

import { useEffect, useState, use } from 'react';
import { useStrategy } from '../../../components/providers';
import { CampaignModel } from '../../../lib/types';
import { MilestoneTimeline } from '../../../components/milestone_timeline';
import { ExternalLink, ShieldCheck, Clock, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CampaignDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const resolvedParams = use(params);
  const campaignAddress = resolvedParams.address;
  const { strategy, activeWallet, mode } = useStrategy();

  const [campaign, setCampaign] = useState<CampaignModel | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('2.0');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = async () => {
    try {
      const data = await strategy.getCampaign(campaignAddress);
      setCampaign(data);
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'Error fetching campaign', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCampaign();
  }, [campaignAddress, strategy, mode]);

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(pledgeAmount) <= 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await strategy.pledge(campaignAddress, Number(pledgeAmount), activeWallet);
      setFeedback({ message: res.message || 'Pledge confirmed', isError: false });
      await fetchCampaign();
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'Pledge failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPledge = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await strategy.cancelPledge(campaignAddress, activeWallet);
      setFeedback({ message: res.message || 'Pledge cancelled and refunded', isError: false });
      await fetchCampaign();
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'Cancel failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimRefund = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await strategy.claimRefund(campaignAddress, activeWallet);
      setFeedback({ message: res.message || 'Refund successfully claimed', isError: false });
      await fetchCampaign();
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'Refund failed', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 py-8 animate-pulse">
        <div className="h-10 bg-slate-900 rounded-xl w-1/3" />
        <div className="h-64 bg-slate-900/60 rounded-3xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="rounded-3xl border border-slate-800 p-12 text-center py-20">
        <h2 className="text-xl font-bold text-white">Campaign Not Found</h2>
        <p className="mt-2 text-sm text-slate-400">The requested address is not recognized on this network.</p>
      </div>
    );
  }

  const percentFunded = Math.min(Math.round((campaign.raisedSol / campaign.goalSol) * 100), 100);
  const isFundingOpen = campaign.status === 'funding';
  const isRefundable = campaign.status === 'failed' || campaign.status === 'terminated';

  return (
    <div className="space-y-10 py-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            {campaign.status}
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>PDA: {campaign.address.slice(0, 8)}...{campaign.address.slice(-6)}</span>
            <a
              href={`https://explorer.solana.com/address/${campaign.address}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight display-font">
          {campaign.title}
        </h1>

        <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
          {campaign.description}
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-xs font-medium flex items-center gap-2 ${
            feedback.isError
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {feedback.isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-white">Financial Breakdown & Escrow Pool</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white text-lg font-bold">{campaign.raisedSol.toFixed(2)} SOL</span>
                <span className="text-slate-400">Goal: {campaign.goalSol} SOL ({percentFunded}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  style={{ width: `${percentFunded}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800 pt-6">
              <div>
                <span className="text-[11px] text-slate-400 block">Distributable</span>
                <span className="text-base font-bold text-white">{campaign.distributableSol.toFixed(2)} SOL</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Released to Creator</span>
                <span className="text-base font-bold text-emerald-400">{campaign.releasedSol.toFixed(2)} SOL</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Reserved for Claims</span>
                <span className="text-base font-bold text-teal-400">{campaign.reservedSol.toFixed(2)} SOL</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">1% Protocol Fee</span>
                <span className="text-base font-bold text-slate-300">{campaign.protocolFeeSol.toFixed(3)} SOL</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Milestone Tranches & Community Governance</h2>
            <MilestoneTimeline campaign={campaign} onRefresh={fetchCampaign} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <h3 className="text-base font-bold text-white">Back This Prototype</h3>

            {isFundingOpen ? (
              <form onSubmit={handlePledge} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Contribution Amount (SOL)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={pledgeAmount}
                      onChange={(e) => setPledgeAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-3 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-500">SOL</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Confirming...' : 'Deposit Pledge to Vault'}
                </button>

                <button
                  type="button"
                  onClick={handleCancelPledge}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                >
                  Cancel Pledge (Refund 100%)
                </button>
              </form>
            ) : isRefundable ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-300 leading-relaxed">
                  Campaign has concluded in an uncompleted state. Backers can execute a permissionless refund from the PDA vault.
                </div>
                <button
                  onClick={handleClaimRefund}
                  disabled={submitting}
                  className="w-full rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-400 transition-all"
                >
                  Claim Refund From Vault
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300 leading-relaxed">
                Funding goal has been met! Tranches release sequentially based on backer vote outcomes.
              </div>
            )}

            <div className="border-t border-slate-800/80 pt-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Non-custodial Program Derived Address (PDA)</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>1 backer = contribution-weighted vote</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStrategy } from '../../../components/providers';
import { Plus, Trash2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

interface MilestoneDraft {
  title: string;
  sharePercent: number;
  workPeriodDays: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { strategy, activeWallet } = useStrategy();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalSol, setGoalSol] = useState('10');
  const [durationDays, setDurationDays] = useState('30');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    { title: 'Alpha Architecture & BPF Smart Contracts', sharePercent: 35, workPeriodDays: 30 },
    { title: 'Testnet Pilot & Security Audit Report', sharePercent: 35, workPeriodDays: 45 },
    { title: 'Mainnet Protocol Launch & SDK Delivery', sharePercent: 30, workPeriodDays: 60 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState<string | null>(null);

  const totalSharePercent = milestones.reduce((sum, m) => sum + (Number(m.sharePercent) || 0), 0);
  const isSharesValid = totalSharePercent === 100 && milestones.every(m => m.sharePercent > 0 && m.sharePercent <= 50);
  const isTrancheCountValid = milestones.length >= 2 && milestones.length <= 5;
  const isDurationValid = Number(durationDays) >= 7 && Number(durationDays) <= 183;

  const handleAddMilestone = () => {
    if (milestones.length >= 5) return;
    setMilestones([
      ...milestones,
      { title: `Milestone ${milestones.length + 1} Delivery`, sharePercent: 10, workPeriodDays: 30 },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 2) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleUpdateMilestone = (index: number, field: keyof MilestoneDraft, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessResult(null);

    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide both campaign title and project description.');
      return;
    }
    if (Number(goalSol) <= 0) {
      setErrorMessage('Funding goal must be greater than 0 SOL.');
      return;
    }
    if (!isDurationValid) {
      setErrorMessage('Funding window must be between 7 and 183 days.');
      return;
    }
    if (!isTrancheCountValid) {
      setErrorMessage('Campaign must specify between 2 and 5 milestone tranches.');
      return;
    }
    if (!isSharesValid) {
      setErrorMessage('All tranche shares must be <= 50% and sum up to exactly 100%.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await strategy.createCampaign(
        {
          title: title.trim(),
          description: description.trim(),
          goalSol: Number(goalSol),
          durationDays: Number(durationDays),
          websiteUrl: websiteUrl.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          milestones: milestones.map((m) => ({
            title: m.title.trim(),
            shareBps: Math.round(Number(m.sharePercent) * 100),
            workPeriodDays: Number(m.workPeriodDays),
          })),
        },
        activeWallet
      );

      setSuccessResult(result.message || 'Campaign successfully sealed and opened for funding');
      setTimeout(() => {
        router.push('/discover');
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed creating campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Launch Milestone Escrow Campaign</h1>
        <p className="mt-1 text-sm text-slate-400">
          Define sealed milestone terms. Tranches cannot be altered after the campaign opens for pledges.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successResult && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successResult}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Project Details</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AetherNet: Ambient IoT Mesh Grid"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the prototype, technical architecture, and value proposition..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Funding Goal (SOL)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={goalSol}
                onChange={(e) => setGoalSol(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Funding Duration (7-183 Days)</label>
              <input
                type="number"
                min="7"
                max="183"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Website (Optional)</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourproject.io"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Banner Image URL (Optional)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Milestone Tranches ({milestones.length}/5)</h2>
              <p className="text-xs text-slate-400">Total allocation must equal 100%, each tranche &le; 50%.</p>
            </div>
            <button
              type="button"
              onClick={handleAddMilestone}
              disabled={milestones.length >= 5}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Tranche
            </button>
          </div>

          <div className="space-y-3">
            {milestones.map((milestone, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1 w-full">
                  <input
                    type="text"
                    required
                    placeholder="Milestone title..."
                    value={milestone.title}
                    onChange={(e) => handleUpdateMilestone(idx, 'title', e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="w-24">
                    <label className="text-[10px] text-slate-500 block">Share (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={milestone.sharePercent}
                      onChange={(e) => handleUpdateMilestone(idx, 'sharePercent', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[10px] text-slate-500 block">Days</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={milestone.workPeriodDays}
                      onChange={(e) => handleUpdateMilestone(idx, 'workPeriodDays', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {milestones.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 mt-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-semibold">
            <span className="text-slate-400">Total Share Allocation:</span>
            <span className={totalSharePercent === 100 ? 'text-emerald-400' : 'text-amber-400'}>
              {totalSharePercent}% {totalSharePercent === 100 ? '(Valid)' : '(Must be exactly 100%)'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3 items-start">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-400 block mb-0.5">Non-Custodial Escrow Guarantee</span>
            Terms are immutably sealed on Solana. If the funding goal is not met within the window, backers reclaim 100% of their SOL with zero platform fee. A 1% protocol fee is deducted only on successful campaigns.
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isSharesValid || !isTrancheCountValid || !isDurationValid}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Sealing Terms On-Chain...' : 'Seal Terms & Launch Campaign'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { MilestoneModel, CampaignModel } from '../lib/types';
import { useStrategy } from './providers';
import { CheckCircle2, Clock, ThumbsUp, ThumbsDown, Lock, ExternalLink, FileCheck, ArrowRight } from 'lucide-react';

interface MilestoneTimelineProps {
  campaign: CampaignModel;
  onRefresh: () => void;
}

export function MilestoneTimeline({ campaign, onRefresh }: MilestoneTimelineProps) {
  const { strategy, activeWallet } = useStrategy();
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [evidenceHashInput, setEvidenceHashInput] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const handleVote = async (milestoneIndex: number, approve: boolean) => {
    setSubmitting(milestoneIndex);
    setFeedbackMessage('');
    try {
      const result = await strategy.voteMilestone(campaign.address, milestoneIndex, approve, activeWallet);
      setFeedbackMessage(result.message || 'Vote successfully recorded');
      onRefresh();
    } catch (err) {
      setFeedbackMessage(err instanceof Error ? err.message : 'Voting failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleFinalizeVote = async (milestoneIndex: number) => {
    setSubmitting(milestoneIndex);
    setFeedbackMessage('');
    try {
      const result = await strategy.finalizeVote(campaign.address, milestoneIndex, activeWallet);
      setFeedbackMessage(result.message || 'Vote finalized');
      onRefresh();
    } catch (err) {
      setFeedbackMessage(err instanceof Error ? err.message : 'Finalization failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleRelease = async (milestoneIndex: number) => {
    setSubmitting(milestoneIndex);
    setFeedbackMessage('');
    try {
      const result = await strategy.releaseMilestone(campaign.address, milestoneIndex, activeWallet);
      setFeedbackMessage(result.message || 'Milestone funds released');
      onRefresh();
    } catch (err) {
      setFeedbackMessage(err instanceof Error ? err.message : 'Release failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleClaimFunds = async (milestoneIndex: number) => {
    setSubmitting(milestoneIndex);
    setFeedbackMessage('');
    try {
      const result = await strategy.claimMilestoneFunds(campaign.address, milestoneIndex, activeWallet);
      setFeedbackMessage(result.message || 'Milestone claim disbursed');
      onRefresh();
    } catch (err) {
      setFeedbackMessage(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmitEvidence = async (milestoneIndex: number) => {
    if (!evidenceHashInput.trim()) return;
    setSubmitting(milestoneIndex);
    setFeedbackMessage('');
    try {
      const result = await strategy.submitEvidence(
        campaign.address,
        milestoneIndex,
        evidenceHashInput.trim(),
        `https://arweave.net/${evidenceHashInput.trim()}`,
        activeWallet
      );
      setFeedbackMessage(result.message || 'Evidence committed');
      setEvidenceHashInput('');
      onRefresh();
    } catch (err) {
      setFeedbackMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      {feedbackMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
          {feedbackMessage}
        </div>
      )}

      <div className="relative border-l-2 border-slate-800 ml-4 space-y-8 pl-6">
        {campaign.milestones.map((milestone) => {
          const isApproved = milestone.status === 'approved';
          const isVoting = milestone.status === 'voting';
          const isPendingEvidence = milestone.status === 'pending_evidence';
          const isLocked = milestone.status === 'locked';
          const isCurrent = milestone.index === campaign.currentMilestoneIndex;

          const totalRaised = campaign.raisedSol || 1;
          const approvalPercent = Math.min(Math.round((milestone.yesWeightSol / totalRaised) * 100), 100);

          return (
            <div key={milestone.index} className="relative group">
              <div
                className={`absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  isApproved
                    ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                    : isVoting
                    ? 'border-amber-400 bg-amber-400 text-slate-950 animate-pulse'
                    : isPendingEvidence
                    ? 'border-teal-400 bg-slate-900 text-teal-400'
                    : 'border-slate-800 bg-slate-950 text-slate-600'
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                ) : isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <span className="text-[10px] font-bold">{milestone.index + 1}</span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition-all hover:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tranche {milestone.index + 1} • {milestone.shareBps / 100}% of pool
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">{milestone.title}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400">
                      {milestone.amountSol.toFixed(3)} SOL
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {milestone.workPeriodDays} days window
                    </span>
                  </div>
                </div>

                {milestone.evidenceHash && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950/70 p-3 border border-slate-800">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono text-slate-300 truncate">
                        {milestone.evidenceHash}
                      </span>
                    </div>
                    {milestone.evidenceUri && (
                      <a
                        href={milestone.evidenceUri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline shrink-0 ml-3"
                      >
                        Proof link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {isVoting && (
                  <div className="mt-5 space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        7-Day Community Voting Window Active
                      </span>
                      <span className="text-slate-300 font-mono">
                        {approvalPercent}% of {totalRaised.toFixed(2)} SOL
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${approvalPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Threshold: Strictly &gt; 50%</span>
                      <span>Yes: {milestone.yesWeightSol.toFixed(2)} SOL | No: {milestone.noWeightSol.toFixed(2)} SOL</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        onClick={() => handleVote(milestone.index, true)}
                        disabled={submitting === milestone.index}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Vote Approve
                      </button>
                      <button
                        onClick={() => handleVote(milestone.index, false)}
                        disabled={submitting === milestone.index}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        Vote Reject
                      </button>
                      <button
                        onClick={() => handleFinalizeVote(milestone.index)}
                        disabled={submitting === milestone.index}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all ml-auto"
                      >
                        Finalize Vote Window
                      </button>
                    </div>
                  </div>
                )}

                {isPendingEvidence && isCurrent && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Submit Milestone Arweave Proof</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="arweave://x8Rk29... or SHA-256 hash"
                        value={evidenceHashInput}
                        onChange={(e) => setEvidenceHashInput(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleSubmitEvidence(milestone.index)}
                        disabled={submitting === milestone.index || !evidenceHashInput.trim()}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Submit Proof
                      </button>
                    </div>
                  </div>
                )}

                {isApproved && isCurrent && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRelease(milestone.index)}
                      disabled={submitting === milestone.index}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-all"
                    >
                      Release Tranche to Creator
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {!milestone.claimWithdrawn && (
                      <button
                        onClick={() => handleClaimFunds(milestone.index)}
                        disabled={submitting === milestone.index}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all"
                      >
                        Withdraw Available Claim
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

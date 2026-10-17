'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  ExternalLink,
  GitCommit,
  Plus,
  Trash2,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from 'lucide-react';
import { MilestoneModel, MilestoneProofMetadata } from '../lib/types';
import {
  computeEvidenceHash,
  formatEvidenceHash,
  verifyEvidenceHash,
} from '../lib/solana/evidence';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'submit' | 'review';
  campaignAddress: string;
  milestone: MilestoneModel;
  activeWallet: string;
  isCreator: boolean;
  isBacker: boolean;
  backerWeightSol?: number;
  existingProof?: MilestoneProofMetadata | null;
  onSubmitEvidence?: (
    metadata: MilestoneProofMetadata,
    evidenceHashBytes: number[],
    evidenceUri: string
  ) => Promise<void>;
  onVote?: (approve: boolean) => Promise<void>;
}

export function EvidenceModal({
  isOpen,
  onClose,
  mode,
  campaignAddress,
  milestone,
  activeWallet,
  isCreator,
  isBacker,
  backerWeightSol = 0,
  existingProof,
  onSubmitEvidence,
  onVote,
}: EvidenceModalProps) {
  // Form state for submit mode
  const [title, setTitle] = useState(milestone.title || `Milestone ${milestone.index + 1}`);
  const [summary, setSummary] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([
    'Core architecture implementation',
    'Automated integration tests',
  ]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [liveHash, setLiveHash] = useState<string>('');

  // Review mode verification state
  const [isHashVerified, setIsHashVerified] = useState<boolean | null>(null);

  const currentMetadata: MilestoneProofMetadata = useMemo(() => {
    return (
      existingProof ?? {
        campaignAddress,
        trancheIndex: milestone.index,
        title,
        summary: summary || 'Milestone deliverables submitted for backer verification.',
        deliverables: deliverables.filter(Boolean),
        repositoryCommitSha: commitSha || undefined,
        externalDemoUrl: demoUrl || undefined,
        submittedAt: Date.now(),
        authorWallet: activeWallet,
      }
    );
  }, [
    existingProof,
    campaignAddress,
    milestone.index,
    title,
    summary,
    deliverables,
    commitSha,
    demoUrl,
    activeWallet,
  ]);

  // Compute live hash when form changes
  useEffect(() => {
    let cancelled = false;
    computeEvidenceHash(currentMetadata).then((res) => {
      if (!cancelled) {
        setLiveHash(res.hex);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentMetadata]);

  // Verify hash in review mode
  useEffect(() => {
    if (mode === 'review' && milestone.evidenceHash) {
      verifyEvidenceHash(currentMetadata, milestone.evidenceHash).then((verified) => {
        setIsHashVerified(verified);
      });
    }
  }, [mode, milestone.evidenceHash, currentMetadata]);

  if (!isOpen) return null;

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables((prev) => [...prev, newDeliverable.trim()]);
    setNewDeliverable('');
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitEvidence) return;

    setSubmitting(true);
    try {
      const hashResult = await computeEvidenceHash(currentMetadata);
      const evidenceUri = `arweave://${hashResult.hex}`;
      await onSubmitEvidence(currentMetadata, hashResult.bytes, evidenceUri);
      onClose();
    } catch (err) {
      console.error('Evidence submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCastVote = async (approve: boolean) => {
    if (!onVote) return;
    setVoting(true);
    try {
      await onVote(approve);
      onClose();
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'submit' ? 'Submit Milestone Proof of Work' : 'Milestone Proof Verification'}
            </h2>
            <p className="text-xs text-slate-400">
              Tranche {milestone.index + 1}: {milestone.title} ({milestone.shareBps / 100}% allocation)
            </p>
          </div>
        </div>

        {mode === 'submit' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Milestone Deliverable Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Summary & Changelog
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe what was built, key milestones delivered, and testing evidence..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Completed Deliverables Checklist
              </label>
              <div className="space-y-2 mb-2.5">
                {deliverables.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(idx)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add item (e.g. smart contracts deployed to devnet)..."
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDeliverable();
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Git Commit SHA (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 84d543d81b499119..."
                  value={commitSha}
                  onChange={(e) => setCommitSha(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Demo / Explorer URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">Computed SHA-256 Hash:</span>
                <span className="font-mono text-emerald-400">{formatEvidenceHash(liveHash)}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This canonical hash will be stored on-chain inside the milestone PDA. Backers verify it
                before releasing escrow capital.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Proof...
                  </>
                ) : (
                  'Publish & Open Vote'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Proof Verification Status</span>
                {isHashVerified === true ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    SHA-256 Cryptographically Verified
                  </span>
                ) : isHashVerified === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Hash Mismatch
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Verifying on-chain hash...</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-900 font-mono">
                <div>
                  <span className="text-slate-400">On-Chain Hash: </span>
                  <span className="text-slate-200">
                    {milestone.evidenceHash ? formatEvidenceHash(milestone.evidenceHash) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Computed Hash: </span>
                  <span className="text-slate-200">{formatEvidenceHash(liveHash)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Deliverables & Evidence
              </h4>
              <div className="space-y-2">
                {(currentMetadata.deliverables || []).map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {currentMetadata.summary && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Summary & Context
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  {currentMetadata.summary}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {currentMetadata.repositoryCommitSha && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-300">
                  <GitCommit className="h-3.5 w-3.5 text-slate-400" />
                  <span>Commit: {currentMetadata.repositoryCommitSha.substring(0, 10)}</span>
                </div>
              )}
              {currentMetadata.externalDemoUrl && (
                <a
                  href={currentMetadata.externalDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-700 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Live Preview / Demo
                </a>
              )}
            </div>

            {milestone.status === 'voting' && isBacker && onVote && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Your Backer Voting Power:</span>
                  <span className="font-bold text-emerald-400">{backerWeightSol.toFixed(2)} SOL</span>
                </div>
                <p className="text-xs text-slate-400">
                  Approval releases {(milestone.amountSol || 0).toFixed(2)} SOL to the creator. Over 50%
                  of total backer pledges must approve.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleCastVote(true)}
                    disabled={voting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all disabled:opacity-50"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Approve Release
                  </button>
                  <button
                    onClick={() => handleCastVote(false)}
                    disabled={voting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Request Revision
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

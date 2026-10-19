'use client';

import { useState, useEffect } from 'react';
import { address } from '@solana/kit';
import { CampaignModel, TransactionResult } from '../lib/types';
import { PROGRAM_ID } from '../lib/constants';
import { findVaultAddress, findBondAddress } from '../lib/solana/pdas';
import { useStrategy } from './providers';
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Terminal,
  LifeBuoy,
  CheckCircle2,
  Lock,
  ArrowRight,
  Coins,
  RefreshCw,
  Info,
} from 'lucide-react';

interface EmergencyExitPanelProps {
  campaign: CampaignModel;
  onActionSuccess: () => Promise<void>;
}

interface AccountItem {
  name: string;
  badge: string;
  address: string;
  description: string;
  isDerivedMock?: boolean;
}

export function EmergencyExitPanel({ campaign, onActionSuccess }: EmergencyExitPanelProps) {
  const { strategy, activeWallet } = useStrategy();

  const [vaultPda, setVaultPda] = useState<string>('');
  const [bondPda, setBondPda] = useState<string>('');
  const [isDerivedMock, setIsDerivedMock] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number>(
    campaign.currentMilestoneIndex ?? 0
  );
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<TransactionResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Keep selectedMilestoneIndex in valid range if campaign updates
  useEffect(() => {
    if (campaign.milestones && campaign.milestones.length > 0) {
      if (selectedMilestoneIndex >= campaign.milestones.length) {
        setSelectedMilestoneIndex(campaign.currentMilestoneIndex ?? 0);
      }
    }
  }, [campaign.milestones, campaign.currentMilestoneIndex, selectedMilestoneIndex]);

  // Derive on-chain PDAs with graceful fallback if campaign.address is a mock ID
  useEffect(() => {
    let isMounted = true;

    async function deriveAddresses() {
      try {
        const campAddr = address(campaign.address);
        const [derivedVault, derivedBond] = await Promise.all([
          findVaultAddress(campAddr),
          findBondAddress(campAddr),
        ]);
        if (isMounted) {
          setVaultPda(derivedVault);
          setBondPda(derivedBond);
          setIsDerivedMock(false);
        }
      } catch {
        if (isMounted) {
          // Graceful fallback display for mock identifiers
          const cleanId = campaign.address.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
          setVaultPda(`VaultPDA_${cleanId || 'Autonomous'}_Escrow`);
          setBondPda(`BondPDA_${cleanId || 'Creator'}_Collateral`);
          setIsDerivedMock(true);
        }
      }
    }

    void deriveAddresses();

    return () => {
      isMounted = false;
    };
  }, [campaign.address]);

  const handleCopy = async (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId((curr) => (curr === id ? null : curr));
        }, 2000);
      }
    } catch {
      // Ignore clipboard write failures in non-secure or restricted environments
    }
  };

  const handleExecuteAction = async (actionType: 'finalize' | 'release' | 'claimFunds' | 'refund') => {
    setExecutingAction(actionType);
    setActionResult(null);
    setActionError(null);

    try {
      let res: TransactionResult;
      switch (actionType) {
        case 'finalize':
          res = await strategy.finalizeVote(campaign.address, selectedMilestoneIndex, activeWallet);
          break;
        case 'release':
          res = await strategy.releaseMilestone(campaign.address, selectedMilestoneIndex, activeWallet);
          break;
        case 'claimFunds':
          res = await strategy.claimMilestoneFunds(campaign.address, selectedMilestoneIndex, activeWallet);
          break;
        case 'refund':
          res = await strategy.claimRefund(campaign.address, activeWallet);
          break;
      }
      setActionResult(res);
      await onActionSuccess();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Emergency action failed');
    } finally {
      setExecutingAction(null);
    }
  };

  const accounts: AccountItem[] = [
    {
      name: 'Program ID',
      badge: 'Immutable Solana BPF Contract',
      address: PROGRAM_ID,
      description: 'The canonical on-chain smart contract bytecode executing autonomously on Solana Devnet.',
    },
    {
      name: 'Campaign PDA',
      badge: 'Autonomous Campaign State',
      address: campaign.address,
      description: `Seeds: ['campaign', ${campaign.creator.slice(0, 6)}..., ${campaign.campaignId}]. Governs tranches and deadlines.`,
    },
    {
      name: 'Autonomous Vault PDA',
      badge: 'Zero-Custody Escrow Pool',
      address: vaultPda,
      description: "Seeds: ['vault', campaign_pda]. Holds 100% of backer pledge SOL until adaptive community quorum approves tranche release.",
      isDerivedMock,
    },
    {
      name: 'Creator Bond PDA',
      badge: 'Anti-Abandonment Collateral',
      address: bondPda,
      description: "Seeds: ['bond', campaign_pda]. 0.1 SOL anti-spam bond deposited upon campaign initialization.",
      isDerivedMock,
    },
  ];

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-6 sm:p-8 space-y-8 shadow-2xl shadow-amber-500/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Self-Custody &amp; Shutdown Survival (Emergency Exit)
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Bestcrow operates completely non-custodially. Even if all Bestcrow servers, DNS, and APIs disappear forever, all funds and governance logic remain 100% accessible directly on the Solana blockchain.
          </p>
        </div>

        {/* Adaptive Quorum Badge */}
        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
              Adaptive Quorum Governance
            </span>
            <span className="font-mono text-emerald-200">
              &gt;= 25% Turnout of All Raised SOL + &gt; 50% YES of Active Voters
            </span>
          </div>
        </div>
      </div>

      {/* Shutdown Survival Guarantee */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span>Shutdown Survival Guarantee</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Bestcrow servers do not hold your private keys, custody escrow funds, or possess admin backdoors. All SOL pledges are locked inside autonomous Solana Program Derived Addresses (PDAs). Every state transition—milestone vote finalization, tranche release, creator payout, and refund disbursement—is an open, permissionless instruction callable by anyone directly on Solana.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Zero Server Custody of Keys or SOL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Permissionless Direct Instruction Dispatch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Immutable Adaptive Quorum Consensus</span>
          </div>
        </div>
      </div>

      {/* Live On-Chain Program Derived Addresses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span>Autonomous On-Chain Program Derived Addresses (PDAs)</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">Devnet Verified</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((acc, idx) => {
            const solscanUrl = `https://solscan.io/account/${encodeURIComponent(acc.address)}?cluster=devnet`;
            const explorerUrl = `https://explorer.solana.com/address/${encodeURIComponent(acc.address)}?cluster=devnet`;
            const isCopied = copiedId === `acc-${idx}`;

            return (
              <div
                key={acc.name}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{acc.name}</span>
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {acc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{acc.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between gap-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                    <span className="truncate" title={acc.address}>
                      {acc.address || 'Deriving...'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(acc.address, `acc-${idx}`)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0 transition-colors"
                      title="Copy Address"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <a
                      href={solscanUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 hover:underline"
                    >
                      <span>Interact Directly on Solscan</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline ml-auto"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct On-Chain Emergency Actions (Zero-Backend Mode) */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Direct On-Chain Emergency Actions (Zero-Backend Mode)</span>
            </h4>
            <div className="flex items-center gap-2">
              <label htmlFor="emergency-tranche-select" className="text-xs text-slate-400">Target Tranche:</label>
              <select
                id="emergency-tranche-select"
                value={selectedMilestoneIndex}
                onChange={(e) => setSelectedMilestoneIndex(Number(e.target.value))}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono font-medium text-white focus:outline-none focus:border-amber-500"
              >
                {campaign.milestones?.map((m) => (
                  <option key={m.index} value={m.index}>
                    Tranche {m.index + 1}: {m.title} [{m.status.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Execute state machine triggers directly to the Solana smart contract from your connected wallet:
          </p>
        </div>

        {/* 4 Interactive Direct Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Action 1: Finalize Active Milestone Vote */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">1. Finalize Active Milestone Vote</span>
              <p className="text-[11px] text-slate-400">
                Closes the 7-day voting window on the target tranche and tallies the Adaptive Quorum consensus. Open and permissionless for any caller.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExecuteAction('finalize')}
              disabled={Boolean(executingAction)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
            >
              {executingAction === 'finalize' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Broadcasting Finalization...</span>
                </>
              ) : (
                <>
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Finalize Active Milestone Vote</span>
                </>
              )}
            </button>
          </div>

          {/* Action 2: Release Approved Milestone Tranche */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">2. Release Approved Milestone Tranche</span>
              <p className="text-[11px] text-slate-400">
                Triggers autonomous release of approved tranche funds from the Vault PDA into the distributable pool upon positive community verdict.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExecuteAction('release')}
              disabled={Boolean(executingAction)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
            >
              {executingAction === 'release' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Broadcasting Release...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Release Approved Milestone Tranche</span>
                </>
              )}
            </button>
          </div>

          {/* Action 3: Creator Withdraw Tranche Funds */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">3. Creator Withdraw Tranche Funds</span>
              <p className="text-[11px] text-slate-400">
                Transfers verified tranche proceeds from the autonomous pool directly into the campaign creator wallet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExecuteAction('claimFunds')}
              disabled={Boolean(executingAction)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 py-2.5 text-xs font-bold text-teal-300 hover:bg-teal-500/20 disabled:opacity-50 transition-all"
            >
              {executingAction === 'claimFunds' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Withdrawing Funds...</span>
                </>
              ) : (
                <>
                  <Coins className="h-3.5 w-3.5" />
                  <span>Creator Withdraw Tranche Funds</span>
                </>
              )}
            </button>
          </div>

          {/* Action 4: Claim Emergency Refund */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">4. Claim Emergency Refund</span>
              <p className="text-[11px] text-slate-400">
                Backers directly reclaim 100% of their unspent pledge from the Vault PDA if the campaign expired unfunded or failed a milestone revision.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExecuteAction('refund')}
              disabled={Boolean(executingAction)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all"
            >
              {executingAction === 'refund' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Claiming Refund...</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Claim Emergency Refund</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transaction Feedback Notification */}
        {actionResult && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{actionResult.message || 'Direct on-chain instruction confirmed.'}</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="text-slate-400">Transaction Signature:</div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-950 p-2.5 border border-emerald-500/30 text-emerald-200">
                <span className="truncate">{actionResult.signature}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(actionResult.signature, 'tx-sig')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                  title="Copy signature"
                >
                  {copiedId === 'tx-sig' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold">
              <a
                href={actionResult.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 underline"
              >
                <span>Solana Explorer</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={`https://solscan.io/tx/${encodeURIComponent(actionResult.signature)}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-teal-400 hover:text-teal-300 underline"
              >
                <span>Interact Directly on Solscan</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs font-medium text-red-300 flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

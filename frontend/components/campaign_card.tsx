import Link from 'next/link';
import { CampaignModel } from '../lib/types';
import { CheckCircle2, Clock, Users, ArrowUpRight, Trash2 } from 'lucide-react';

export function CampaignCard({
  campaign,
  onDelete,
}: {
  campaign: CampaignModel;
  onDelete?: (address: string) => void;
}) {
  const percentFunded = Math.min(Math.round((campaign.raisedSol / campaign.goalSol) * 100), 100);
  const daysLeft = Math.max(0, Math.ceil((campaign.fundingDeadline - Math.floor(Date.now() / 1000)) / 86400));

  const statusColors = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    funding: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    success: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    terminated: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-lg shadow-black/20">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusColors[campaign.status]}`}>
            {campaign.status}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            {daysLeft > 0 ? `${daysLeft}d left` : 'Closed'}
          </span>
        </div>

        <h3 className="mt-4 text-xl font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
          {campaign.title}
        </h3>

        <p className="mt-2 text-sm text-slate-400 line-clamp-2 leading-relaxed">
          {campaign.description}
        </p>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-white">{campaign.raisedSol.toFixed(2)} SOL</span>
            <span className="text-slate-400">Goal: {campaign.goalSol} SOL ({percentFunded}%)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${percentFunded}%` }}
            />
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Milestone Tranches ({campaign.milestones.length})</p>
          <div className="mt-2.5 flex items-center gap-1.5">
            {campaign.milestones.map((milestone) => {
              const isApproved = milestone.status === 'approved';
              const isVoting = milestone.status === 'voting';
              const isPending = milestone.status === 'pending_evidence';

              return (
                <div
                  key={milestone.index}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    isApproved
                      ? 'bg-emerald-400'
                      : isVoting
                      ? 'bg-amber-400 animate-pulse'
                      : isPending
                      ? 'bg-teal-600'
                      : 'bg-slate-800'
                  }`}
                  title={`Tranche ${milestone.index + 1}: ${milestone.shareBps / 100}% (${milestone.status})`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          <span>{campaign.backerCount} backers</span>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.confirm(`Delete "${campaign.title}" from local storage?`)) {
                  onDelete(campaign.address);
                }
              }}
              title="Delete campaign"
              className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <Link
            href={`/campaign/${campaign.address}`}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-500 hover:text-slate-950"
          >
            View Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

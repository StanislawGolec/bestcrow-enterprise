#![allow(ambiguous_glob_reexports)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use state::*;

declare_id!("3jGgPRa4gH25wfL49E3TAtpix5ePUZKWrQLT83eNZBVr");

#[program]
pub mod bestcrow {
    use super::*;

    pub fn create_draft(
        ctx: Context<CreateDraft>,
        campaign_id: u64,
        goal: u64,
        terms_hash: [u8; 32],
        content_uri: u32,
    ) -> Result<()> {
        instructions::campaign::create_draft(ctx, campaign_id, goal, terms_hash, content_uri)
    }

    pub fn add_tranche(
        ctx: Context<AddTranche>,
        index: u8,
        share_bps: u16,
        work_period: i64,
    ) -> Result<()> {
        instructions::campaign::add_tranche(ctx, index, share_bps, work_period)
    }

    pub fn seal_terms<'info>(
        ctx: Context<'_, '_, 'info, 'info, SealTerms<'info>>,
        funding_seconds: i64,
        terms_hash: [u8; 32],
    ) -> Result<()> {
        instructions::campaign::seal_terms(ctx, funding_seconds, terms_hash)
    }

    pub fn pledge(ctx: Context<Pledge>, amount: u64) -> Result<()> {
        instructions::funding::pledge(ctx, amount)
    }

    pub fn cancel_pledge(ctx: Context<CancelPledge>) -> Result<()> {
        instructions::funding::cancel_pledge(ctx)
    }

    pub fn finalize_funding<'info>(
        ctx: Context<'_, '_, 'info, 'info, FinalizeFunding<'info>>,
    ) -> Result<()> {
        instructions::settlement::finalize_funding(ctx)
    }

    pub fn refund_for(ctx: Context<RefundFor>) -> Result<()> {
        instructions::settlement::refund_for(ctx)
    }

    pub fn submit_evidence(
        ctx: Context<SubmitEvidence>,
        index: u8,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        instructions::voting::submit_evidence(ctx, index, evidence_hash)
    }

    pub fn vote_milestone(
        ctx: Context<VoteMilestone>,
        index: u8,
        approve: bool,
    ) -> Result<()> {
        instructions::voting::vote_milestone(ctx, index, approve)
    }

    pub fn finalize_vote(
        ctx: Context<FinalizeVote>,
        index: u8,
    ) -> Result<()> {
        instructions::voting::finalize_vote(ctx, index)
    }

    pub fn release_tranche(
        ctx: Context<ReleaseTranche>,
        index: u8,
    ) -> Result<()> {
        instructions::release::release_tranche(ctx, index)
    }

    pub fn withdraw_claim(
        ctx: Context<WithdrawClaim>,
        index: u8,
    ) -> Result<()> {
        instructions::release::withdraw_claim(ctx, index)
    }

    pub fn claim_bond(ctx: Context<ClaimBond>) -> Result<()> {
        instructions::bond::claim_bond(ctx)
    }

    pub fn close_backer(ctx: Context<CloseBacker>) -> Result<()> {
        instructions::bond::close_backer(ctx)
    }
}

use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::BestcrowError,
    state::{Backer, Campaign, CampaignState, Tranche, TrancheStatus, Vote},
};

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct SubmitEvidence<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [TRANCHE_SEED, campaign.key().as_ref(), &[index]],
        bump = tranche.bump
    )]
    pub tranche: Account<'info, Tranche>,
}

pub fn submit_evidence(
    ctx: Context<SubmitEvidence>,
    index: u8,
    evidence_hash: [u8; 32],
) -> Result<()> {
    let campaign = &ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Success,
        BestcrowError::CampaignNotActive
    );
    require!(
        index == campaign.current_tranche,
        BestcrowError::TrancheNotCurrent
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    let tranche = &mut ctx.accounts.tranche;
    require!(
        tranche.status == TrancheStatus::PendingEvidence
            || tranche.status == TrancheStatus::Revision,
        BestcrowError::InvalidTrancheStatus
    );

    if tranche.evidence_deadline > 0 {
        require!(
            current_timestamp <= tranche.evidence_deadline,
            BestcrowError::EvidenceOverdue
        );
    }

    tranche.evidence_hash = evidence_hash;
    tranche.vote_start = current_timestamp;
    tranche.status = TrancheStatus::Voting;
    tranche.yes_weight = 0;
    tranche.no_weight = 0;

    emit!(EvidenceSubmittedEvent {
        campaign: campaign.key(),
        tranche_index: index,
        evidence_hash,
        round: tranche.round,
        vote_start: current_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct VoteMilestone<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,
    #[account(
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [TRANCHE_SEED, campaign.key().as_ref(), &[index]],
        bump = tranche.bump
    )]
    pub tranche: Account<'info, Tranche>,
    #[account(
        seeds = [BACKER_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = backer_ledger.bump
    )]
    pub backer_ledger: Account<'info, Backer>,
    #[account(
        init,
        payer = backer,
        space = 8 + Vote::INIT_SPACE,
        seeds = [VOTE_SEED, tranche.key().as_ref(), &[tranche.round], backer.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, Vote>,
    pub system_program: Program<'info, System>,
}

pub fn vote_milestone(
    ctx: Context<VoteMilestone>,
    index: u8,
    approve: bool,
) -> Result<()> {
    let campaign = &ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Success,
        BestcrowError::CampaignNotActive
    );
    require!(
        index == campaign.current_tranche,
        BestcrowError::TrancheNotCurrent
    );

    let tranche = &mut ctx.accounts.tranche;
    require!(
        tranche.status == TrancheStatus::Voting,
        BestcrowError::VoteNotOpen
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    let vote_deadline = tranche
        .vote_start
        .checked_add(VOTING_WINDOW_SECONDS)
        .ok_or(BestcrowError::ArithmeticOverflow)?;
    require!(
        current_timestamp <= vote_deadline,
        BestcrowError::VoteWindowClosed
    );

    let ledger = &ctx.accounts.backer_ledger;
    require!(ledger.amount > 0 && !ledger.cancelled, BestcrowError::IneligibleVoter);

    let vote_weight = ledger.amount;
    if approve {
        tranche.yes_weight = tranche
            .yes_weight
            .checked_add(vote_weight)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
    } else {
        tranche.no_weight = tranche
            .no_weight
            .checked_add(vote_weight)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
    }

    let vote_record = &mut ctx.accounts.vote_record;
    vote_record.campaign = campaign.key();
    vote_record.tranche = index;
    vote_record.round = tranche.round;
    vote_record.backer = ctx.accounts.backer.key();
    vote_record.approve = approve;
    vote_record.weight = vote_weight;
    vote_record.bump = ctx.bumps.vote_record;

    emit!(VoteCastEvent {
        campaign: campaign.key(),
        tranche_index: index,
        round: tranche.round,
        backer: ctx.accounts.backer.key(),
        approve,
        weight: vote_weight,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct FinalizeVote<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [TRANCHE_SEED, campaign.key().as_ref(), &[index]],
        bump = tranche.bump
    )]
    pub tranche: Account<'info, Tranche>,
}

pub fn evaluate_adaptive_quorum(yes_weight: u64, no_weight: u64, total_raised: u64) -> bool {
    if total_raised == 0 {
        return false;
    }

    let active_votes = (yes_weight as u128) + (no_weight as u128);
    let turnout_met = active_votes * (BPS_DENOMINATOR as u128)
        >= (total_raised as u128) * (QUORUM_TURNOUT_BPS as u128);
    let majority_yes = yes_weight > no_weight;

    turnout_met && majority_yes
}

pub fn finalize_vote(ctx: Context<FinalizeVote>, index: u8) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Success,
        BestcrowError::CampaignNotActive
    );
    require!(
        index == campaign.current_tranche,
        BestcrowError::TrancheNotCurrent
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    let tranche = &mut ctx.accounts.tranche;
    require!(
        tranche.status == TrancheStatus::Voting,
        BestcrowError::VoteNotOpen
    );

    let vote_deadline = tranche
        .vote_start
        .checked_add(VOTING_WINDOW_SECONDS)
        .ok_or(BestcrowError::ArithmeticOverflow)?;
    require!(
        current_timestamp > vote_deadline,
        BestcrowError::VoteWindowStillOpen
    );

    let is_approved = evaluate_adaptive_quorum(tranche.yes_weight, tranche.no_weight, campaign.raised);

    if is_approved {
        tranche.status = TrancheStatus::Approved;
    } else if tranche.round == 1 {
        tranche.round = 2;
        tranche.status = TrancheStatus::Revision;
        tranche.evidence_deadline = current_timestamp
            .checked_add(REVISION_WINDOW_SECONDS)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
    } else {
        tranche.status = TrancheStatus::Rejected;
        campaign.state = CampaignState::Terminated;
        campaign.refund_pool = campaign.distributable
            .checked_sub(campaign.released)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
        campaign.bond_forfeited = true;
    }

    emit!(VoteFinalizedEvent {
        campaign: campaign.key(),
        tranche_index: index,
        round: tranche.round,
        approved: is_approved,
        yes_weight: tranche.yes_weight,
        no_weight: tranche.no_weight,
        total_raised: campaign.raised,
    });

    Ok(())
}

#[event]
pub struct EvidenceSubmittedEvent {
    pub campaign: Pubkey,
    pub tranche_index: u8,
    pub evidence_hash: [u8; 32],
    pub round: u8,
    pub vote_start: i64,
}

#[event]
pub struct VoteCastEvent {
    pub campaign: Pubkey,
    pub tranche_index: u8,
    pub round: u8,
    pub backer: Pubkey,
    pub approve: bool,
    pub weight: u64,
}

#[event]
pub struct VoteFinalizedEvent {
    pub campaign: Pubkey,
    pub tranche_index: u8,
    pub round: u8,
    pub approved: bool,
    pub yes_weight: u64,
    pub no_weight: u64,
    pub total_raised: u64,
}

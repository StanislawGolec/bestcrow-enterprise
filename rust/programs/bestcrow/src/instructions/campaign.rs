use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::BestcrowError,
    state::{Campaign, CampaignState, Tranche, TrancheStatus},
};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateDraft<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), &campaign_id.to_le_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    pub system_program: Program<'info, System>,
}

pub fn create_draft(
    ctx: Context<CreateDraft>,
    campaign_id: u64,
    goal: u64,
    terms_hash: [u8; 32],
    content_uri: u32,
) -> Result<()> {
    require!(goal > 0, BestcrowError::InvalidGoal);
    let campaign = &mut ctx.accounts.campaign;
    campaign.creator = ctx.accounts.creator.key();
    campaign.campaign_id = campaign_id;
    campaign.goal = goal;
    campaign.funding_deadline = 0;
    campaign.terms_hash = terms_hash;
    campaign.content_uri = content_uri;
    campaign.state = CampaignState::Draft;
    campaign.tranche_count = 0;
    campaign.current_tranche = 0;
    campaign.raised = 0;
    campaign.fee = 0;
    campaign.distributable = 0;
    campaign.released = 0;
    campaign.reserved = 0;
    campaign.refund_pool = 0;
    campaign.bond_forfeited = false;
    campaign.bond_settled = false;
    campaign.bump = ctx.bumps.campaign;
    Ok(())
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct AddTranche<'info> {
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
        init,
        payer = creator,
        space = 8 + Tranche::INIT_SPACE,
        seeds = [TRANCHE_SEED, campaign.key().as_ref(), &[index]],
        bump
    )]
    pub tranche: Account<'info, Tranche>,
    pub system_program: Program<'info, System>,
}

pub fn add_tranche(
    ctx: Context<AddTranche>,
    index: u8,
    share_bps: u16,
    work_period: i64,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Draft,
        BestcrowError::TermsAlreadySealed
    );
    require!(
        index == campaign.tranche_count && (index as usize) < MAX_TRANCHES,
        BestcrowError::InvalidTrancheCount
    );
    let share = share_bps as u64;
    require!(
        share > 0 && share <= MAX_TRANCHE_BPS,
        BestcrowError::InvalidTrancheShare
    );
    require!(work_period > 0, BestcrowError::InvalidFundingDuration);

    let tranche = &mut ctx.accounts.tranche;
    tranche.campaign = campaign.key();
    tranche.index = index;
    tranche.share_bps = share_bps;
    tranche.work_period = work_period;
    tranche.status = if index == 0 {
        TrancheStatus::PendingEvidence
    } else {
        TrancheStatus::Locked
    };
    tranche.evidence_deadline = 0;
    tranche.evidence_hash = [0u8; 32];
    tranche.round = 1;
    tranche.vote_start = 0;
    tranche.yes_weight = 0;
    tranche.no_weight = 0;
    tranche.amount = 0;
    tranche.claim_withdrawn = false;
    tranche.bump = ctx.bumps.tranche;

    campaign.tranche_count = campaign
        .tranche_count
        .checked_add(1)
        .ok_or(BestcrowError::ArithmeticOverflow)?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(funding_seconds: i64)]
pub struct SealTerms<'info> {
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
        init,
        payer = creator,
        space = 0,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Protocol vault account derived as PDA.
    pub vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [BOND_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Creator bond escrow account derived as PDA.
    pub bond: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn seal_terms<'info>(
    ctx: Context<'_, '_, 'info, 'info, SealTerms<'info>>,
    funding_seconds: i64,
    _terms_hash: [u8; 32],
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Draft,
        BestcrowError::TermsAlreadySealed
    );
    require!(
        (campaign.tranche_count as usize) >= MIN_TRANCHES
            && (campaign.tranche_count as usize) <= MAX_TRANCHES,
        BestcrowError::InvalidTrancheCount
    );
    require!(
        funding_seconds >= MIN_FUNDING_SECONDS && funding_seconds <= MAX_FUNDING_SECONDS,
        BestcrowError::InvalidFundingDuration
    );

    let mut cumulative_share: u64 = 0;
    require!(
        ctx.remaining_accounts.len() == campaign.tranche_count as usize,
        BestcrowError::InvalidTrancheCount
    );
    for (index, account_info) in ctx.remaining_accounts.iter().enumerate() {
        let expected_pda = Pubkey::find_program_address(
            &[TRANCHE_SEED, campaign.key().as_ref(), &[index as u8]],
            &crate::ID,
        )
        .0;
        require_keys_eq!(*account_info.key, expected_pda, BestcrowError::InvalidTrancheIndex);
        require_keys_eq!(*account_info.owner, crate::ID, BestcrowError::InvalidTrancheIndex);
        let tranche = Account::<Tranche>::try_from(account_info)?;
        require!(tranche.index as usize == index, BestcrowError::InvalidTrancheIndex);
        let share = tranche.share_bps as u64;
        require!(
            share > 0 && share <= MAX_TRANCHE_BPS,
            BestcrowError::InvalidTrancheShare
        );
        cumulative_share = cumulative_share
            .checked_add(share)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
    }
    require!(
        cumulative_share == BPS_DENOMINATOR,
        BestcrowError::TrancheSharesNotFull
    );

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.bond.to_account_info(),
            },
        ),
        CREATOR_BOND_LAMPORTS,
    )?;

    let current_timestamp = Clock::get()?.unix_timestamp;
    campaign.funding_deadline = current_timestamp
        .checked_add(funding_seconds)
        .ok_or(BestcrowError::ArithmeticOverflow)?;
    campaign.state = CampaignState::Funding;
    Ok(())
}

pub fn allocate_tranche_amounts<'a>(
    tranche_accounts: &'a [AccountInfo<'a>],
    distributable_funds: u64,
) -> Result<()> {
    let mut allocated_sum: u64 = 0;
    let total_accounts = tranche_accounts.len();

    for (index, account_info) in tranche_accounts.iter().enumerate() {
        let mut tranche = Account::<Tranche>::try_from(account_info)?;
        let tranche_amount = if index == total_accounts - 1 {
            distributable_funds
                .checked_sub(allocated_sum)
                .ok_or(BestcrowError::ArithmeticOverflow)?
        } else {
            ((distributable_funds as u128)
                * (tranche.share_bps as u128)
                / (BPS_DENOMINATOR as u128)) as u64
        };

        allocated_sum = allocated_sum
            .checked_add(tranche_amount)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
        tranche.amount = tranche_amount;
        tranche.exit(&crate::ID)?;
    }
    Ok(())
}

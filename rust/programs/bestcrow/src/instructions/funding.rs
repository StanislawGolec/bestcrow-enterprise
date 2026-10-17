use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::BestcrowError,
    state::{Backer, Campaign, CampaignState},
};

#[derive(Accounts)]
pub struct Pledge<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init_if_needed,
        payer = backer,
        space = 8 + Backer::INIT_SPACE,
        seeds = [BACKER_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump
    )]
    pub backer_ledger: Account<'info, Backer>,
    #[account(
        mut,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Protocol vault account derived as PDA.
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn pledge(ctx: Context<Pledge>, amount: u64) -> Result<()> {
    require!(amount > 0, BestcrowError::InvalidPledgeAmount);
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Funding,
        BestcrowError::NotFundingPhase
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    require!(
        current_timestamp < campaign.funding_deadline,
        BestcrowError::FundingWindowClosed
    );

    let ledger = &mut ctx.accounts.backer_ledger;
    if ledger.amount == 0 && !ledger.cancelled {
        ledger.campaign = campaign.key();
        ledger.backer = ctx.accounts.backer.key();
        ledger.refund_claimed = false;
        ledger.termination_refund_claimed = false;
        ledger.bump = ctx.bumps.backer_ledger;
    }

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.backer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    ledger.amount = ledger
        .amount
        .checked_add(amount)
        .ok_or(BestcrowError::ArithmeticOverflow)?;
    ledger.cancelled = false;

    campaign.raised = campaign
        .raised
        .checked_add(amount)
        .ok_or(BestcrowError::ArithmeticOverflow)?;

    emit!(PledgeEvent {
        campaign: campaign.key(),
        backer: ctx.accounts.backer.key(),
        amount,
        total_backer_pledge: ledger.amount,
        total_campaign_raised: campaign.raised,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CancelPledge<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        has_one = campaign,
        has_one = backer,
        seeds = [BACKER_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = backer_ledger.bump
    )]
    pub backer_ledger: Account<'info, Backer>,
    #[account(
        mut,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Protocol vault account derived as PDA.
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn cancel_pledge(ctx: Context<CancelPledge>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Funding,
        BestcrowError::NotFundingPhase
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    require!(
        current_timestamp < campaign.funding_deadline,
        BestcrowError::FundingWindowClosed
    );

    let ledger = &mut ctx.accounts.backer_ledger;
    require!(ledger.amount > 0, BestcrowError::NoActivePledge);
    require!(!ledger.cancelled, BestcrowError::PledgeAlreadyCancelled);

    let refund_amount = ledger.amount;
    let vault_seeds = &[
        VAULT_SEED,
        campaign.to_account_info().key.as_ref(),
        &[ctx.bumps.vault],
    ];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.backer.to_account_info(),
            },
            &[&vault_seeds[..]],
        ),
        refund_amount,
    )?;

    campaign.raised = campaign
        .raised
        .checked_sub(refund_amount)
        .ok_or(BestcrowError::ArithmeticOverflow)?;

    ledger.amount = 0;
    ledger.cancelled = true;

    emit!(PledgeCancelledEvent {
        campaign: campaign.key(),
        backer: ctx.accounts.backer.key(),
        refunded_amount: refund_amount,
        remaining_campaign_raised: campaign.raised,
    });

    Ok(())
}

#[event]
pub struct PledgeEvent {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub total_backer_pledge: u64,
    pub total_campaign_raised: u64,
}

#[event]
pub struct PledgeCancelledEvent {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub refunded_amount: u64,
    pub remaining_campaign_raised: u64,
}

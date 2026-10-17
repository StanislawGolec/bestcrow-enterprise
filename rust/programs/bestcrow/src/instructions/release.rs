use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::BestcrowError,
    state::{Campaign, CampaignState, Tranche, TrancheStatus},
};

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct ReleaseTranche<'info> {
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

pub fn release_tranche(ctx: Context<ReleaseTranche>, index: u8) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
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
        tranche.status == TrancheStatus::Approved,
        BestcrowError::InvalidTrancheStatus
    );

    campaign.released = campaign
        .released
        .checked_add(tranche.amount)
        .ok_or(BestcrowError::ArithmeticOverflow)?;
    campaign.reserved = campaign
        .reserved
        .checked_sub(tranche.amount)
        .ok_or(BestcrowError::ArithmeticOverflow)?;

    let next_index = index.checked_add(1).ok_or(BestcrowError::ArithmeticOverflow)?;
    if (next_index as usize) < (campaign.tranche_count as usize) {
        campaign.current_tranche = next_index;
    } else {
        campaign.state = CampaignState::Completed;
    }

    emit!(TrancheReleasedEvent {
        campaign: campaign.key(),
        tranche_index: index,
        amount: tranche.amount,
        cumulative_released: campaign.released,
        completed: campaign.state == CampaignState::Completed,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct WithdrawClaim<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
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
    #[account(
        mut,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Protocol vault account derived as PDA.
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_claim(ctx: Context<WithdrawClaim>, index: u8) -> Result<()> {
    let tranche = &mut ctx.accounts.tranche;
    require!(
        tranche.status == TrancheStatus::Approved,
        BestcrowError::ClaimUnavailable
    );
    require!(!tranche.claim_withdrawn, BestcrowError::ClaimAlreadyWithdrawn);

    let claim_amount = tranche.amount;
    let campaign = &ctx.accounts.campaign;
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
                to: ctx.accounts.creator.to_account_info(),
            },
            &[&vault_seeds[..]],
        ),
        claim_amount,
    )?;

    tranche.claim_withdrawn = true;

    emit!(ClaimWithdrawnEvent {
        campaign: campaign.key(),
        tranche_index: index,
        creator: ctx.accounts.creator.key(),
        amount: claim_amount,
    });

    Ok(())
}

#[event]
pub struct TrancheReleasedEvent {
    pub campaign: Pubkey,
    pub tranche_index: u8,
    pub amount: u64,
    pub cumulative_released: u64,
    pub completed: bool,
}

#[event]
pub struct ClaimWithdrawnEvent {
    pub campaign: Pubkey,
    pub tranche_index: u8,
    pub creator: Pubkey,
    pub amount: u64,
}

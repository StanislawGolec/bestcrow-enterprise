use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::BestcrowError,
    state::{Backer, Campaign, CampaignState},
};

#[derive(Accounts)]
pub struct ClaimBond<'info> {
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
        seeds = [BOND_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Creator bond escrow account derived as PDA.
    pub bond: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn claim_bond(ctx: Context<ClaimBond>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(!campaign.bond_settled, BestcrowError::BondUnavailable);

    let is_eligible = campaign.state == CampaignState::Completed
        || (campaign.state == CampaignState::Failed && !campaign.bond_forfeited);
    require!(is_eligible, BestcrowError::BondUnavailable);

    let campaign_key = campaign.key();
    let bond_seeds = &[
        BOND_SEED,
        campaign_key.as_ref(),
        &[ctx.bumps.bond],
    ];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.bond.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
            &[&bond_seeds[..]],
        ),
        CREATOR_BOND_LAMPORTS,
    )?;

    campaign.bond_settled = true;

    emit!(BondClaimedEvent {
        campaign: campaign.key(),
        creator: ctx.accounts.creator.key(),
        amount: CREATOR_BOND_LAMPORTS,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CloseBacker<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,
    #[account(
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        close = backer,
        has_one = campaign,
        has_one = backer,
        seeds = [BACKER_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = backer_ledger.bump
    )]
    pub backer_ledger: Account<'info, Backer>,
}

pub fn close_backer(ctx: Context<CloseBacker>) -> Result<()> {
    let campaign = &ctx.accounts.campaign;
    let ledger = &ctx.accounts.backer_ledger;

    let is_terminal = campaign.state == CampaignState::Completed
        || campaign.state == CampaignState::Failed
        || campaign.state == CampaignState::Terminated;
    require!(is_terminal, BestcrowError::CampaignNotActive);

    if campaign.state == CampaignState::Failed {
        require!(ledger.refund_claimed || ledger.cancelled || ledger.amount == 0, BestcrowError::NotRefundable);
    } else if campaign.state == CampaignState::Terminated {
        require!(ledger.termination_refund_claimed || ledger.cancelled || ledger.amount == 0, BestcrowError::NotRefundable);
    }

    Ok(())
}

#[event]
pub struct BondClaimedEvent {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
}

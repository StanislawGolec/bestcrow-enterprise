use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::BestcrowError,
    instructions::campaign::allocate_tranche_amounts,
    state::{Backer, Campaign, CampaignState, Tranche, TrancheStatus},
};

#[derive(Accounts)]
pub struct FinalizeFunding<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: Target protocol treasury receiving the 1% fee upon success.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
}

pub fn finalize_funding<'info>(ctx: Context<'_, '_, 'info, 'info, FinalizeFunding<'info>>) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Funding,
        BestcrowError::NotFundingPhase
    );
    require!(
        current_timestamp >= campaign.funding_deadline,
        BestcrowError::FundingWindowStillOpen
    );

    let raised_amount = campaign.raised;
    let is_goal_met = raised_amount >= campaign.goal;

    if is_goal_met {
        let protocol_fee = ((raised_amount as u128) * (PROTOCOL_FEE_BPS as u128)
            / (BPS_DENOMINATOR as u128)) as u64;

        campaign.fee = protocol_fee;
        campaign.distributable = raised_amount
            .checked_sub(protocol_fee)
            .ok_or(BestcrowError::ArithmeticOverflow)?;
        campaign.state = CampaignState::Success;

        if protocol_fee > 0 {
            require_keys_eq!(
                ctx.accounts.treasury.key(),
                PROTOCOL_TREASURY,
                BestcrowError::BondUnavailable
            );
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? = ctx
                .accounts
                .treasury
                .lamports()
                .checked_add(protocol_fee)
                .ok_or(BestcrowError::ArithmeticOverflow)?;
        }

        allocate_tranche_amounts(ctx.remaining_accounts, campaign.distributable)?;
        campaign.reserved = campaign.distributable;

        if let Some(first_tranche_info) = ctx.remaining_accounts.first() {
            let mut first_tranche = Account::<Tranche>::try_from(first_tranche_info)?;
            first_tranche.evidence_deadline = current_timestamp
                .checked_add(first_tranche.work_period)
                .ok_or(BestcrowError::ArithmeticOverflow)?;
            first_tranche.status = TrancheStatus::PendingEvidence;
            first_tranche.round = 1;
            first_tranche.exit(&crate::ID)?;
        }
    } else {
        campaign.fee = 0;
        campaign.distributable = 0;
        campaign.state = CampaignState::Failed;
    }

    emit!(FundingFinalizedEvent {
        campaign: campaign.key(),
        raised: raised_amount,
        fee: campaign.fee,
        success: is_goal_met,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RefundFor<'info> {
    pub caller: Signer<'info>,
    #[account(
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        has_one = campaign,
        seeds = [BACKER_SEED, campaign.key().as_ref(), backer_wallet.key().as_ref()],
        bump = backer_ledger.bump
    )]
    pub backer_ledger: Account<'info, Backer>,
    /// CHECK: Target backer wallet receiving funds.
    #[account(mut)]
    pub backer_wallet: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    /// CHECK: Protocol vault account derived as PDA.
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn refund_for(ctx: Context<RefundFor>) -> Result<()> {
    let campaign = &ctx.accounts.campaign;
    let ledger = &mut ctx.accounts.backer_ledger;

    let refund_amount: u64;

    if campaign.state == CampaignState::Failed {
        require!(!ledger.refund_claimed, BestcrowError::RefundAlreadyClaimed);
        require!(ledger.amount > 0 && !ledger.cancelled, BestcrowError::NoActivePledge);
        refund_amount = ledger.amount;
        ledger.refund_claimed = true;
    } else if campaign.state == CampaignState::Terminated {
        require!(
            !ledger.termination_refund_claimed,
            BestcrowError::RefundAlreadyClaimed
        );
        require!(ledger.amount > 0 && !ledger.cancelled, BestcrowError::NoActivePledge);
        require!(campaign.raised > 0, BestcrowError::ArithmeticOverflow);

        refund_amount = ((ledger.amount as u128) * (campaign.refund_pool as u128)
            / (campaign.raised as u128)) as u64;
        ledger.termination_refund_claimed = true;
    } else {
        return err!(BestcrowError::NotRefundable);
    }

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
                to: ctx.accounts.backer_wallet.to_account_info(),
            },
            &[&vault_seeds[..]],
        ),
        refund_amount,
    )?;

    emit!(BackerRefundedEvent {
        campaign: campaign.key(),
        backer: ctx.accounts.backer_wallet.key(),
        amount: refund_amount,
        is_termination_refund: campaign.state == CampaignState::Terminated,
    });

    Ok(())
}

#[event]
pub struct FundingFinalizedEvent {
    pub campaign: Pubkey,
    pub raised: u64,
    pub fee: u64,
    pub success: bool,
}

#[event]
pub struct BackerRefundedEvent {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub is_termination_refund: bool,
}

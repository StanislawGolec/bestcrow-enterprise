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

#[cfg(test)]
mod tests {
    use crate::constants::*;
    use crate::state::{CampaignState, TrancheStatus};

    #[test]
    fn test_constants_and_pda_seeds() {
        assert_eq!(CAMPAIGN_SEED, b"campaign");
        assert_eq!(TRANCHE_SEED, b"tranche");
        assert_eq!(BACKER_SEED, b"backer");
        assert_eq!(VOTE_SEED, b"vote");
        assert_eq!(VAULT_SEED, b"vault");
        assert_eq!(BOND_SEED, b"bond");
        assert_eq!(BPS_DENOMINATOR, 10_000);
        assert_eq!(MAX_TRANCHE_BPS, 5_000);
        assert_eq!(PROTOCOL_FEE_BPS, 100);
        assert_eq!(CREATOR_BOND_LAMPORTS, 100_000_000);
        assert_eq!(MIN_TRANCHES, 2);
        assert_eq!(MAX_TRANCHES, 5);
        assert_eq!(MIN_FUNDING_SECONDS, 7 * 86_400);
        assert_eq!(MAX_FUNDING_SECONDS, 183 * 86_400);
        assert_eq!(VOTING_WINDOW_SECONDS, 7 * 86_400);
        assert_eq!(REVISION_WINDOW_SECONDS, 30 * 86_400);
    }

    #[test]
    fn test_voting_quorum_strict_greater_than_half() {
        let total_raised: u64 = 1_000_000_000;

        let yes_50: u64 = 500_000_000;
        let is_approved_50 = (yes_50 as u128) * 2 > (total_raised as u128);
        assert!(!is_approved_50, "50% exact approval must be rejected");

        let yes_above_50: u64 = 500_000_001;
        let is_approved_above = (yes_above_50 as u128) * 2 > (total_raised as u128);
        assert!(is_approved_above, "50% + 1 lamport must be approved");

        let yes_below_50: u64 = 499_999_999;
        let is_approved_below = (yes_below_50 as u128) * 2 > (total_raised as u128);
        assert!(!is_approved_below, "<50% must be rejected");

        let yes_100: u64 = total_raised;
        let is_approved_100 = (yes_100 as u128) * 2 > (total_raised as u128);
        assert!(is_approved_100, "100% must be approved");

        let is_approved_0 = (0u128) * 2 > (total_raised as u128);
        assert!(!is_approved_0, "0% must be rejected");
    }

    #[test]
    fn test_tranche_basis_point_validation() {
        let valid_3_tranches: [u16; 3] = [3000, 3000, 4000];
        let sum_3: u64 = valid_3_tranches.iter().map(|&s| s as u64).sum();
        assert_eq!(sum_3, BPS_DENOMINATOR);
        assert!(valid_3_tranches.iter().all(|&s| (s as u64) <= MAX_TRANCHE_BPS && s > 0));

        let valid_5_tranches: [u16; 5] = [2000, 2000, 2000, 2000, 2000];
        let sum_5: u64 = valid_5_tranches.iter().map(|&s| s as u64).sum();
        assert_eq!(sum_5, BPS_DENOMINATOR);

        let valid_2_tranches: [u16; 2] = [5000, 5000];
        let sum_2: u64 = valid_2_tranches.iter().map(|&s| s as u64).sum();
        assert_eq!(sum_2, BPS_DENOMINATOR);

        let invalid_over_max: [u16; 2] = [6000, 4000];
        assert!(invalid_over_max[0] as u64 > MAX_TRANCHE_BPS);

        let invalid_sum_under: [u16; 3] = [3000, 3000, 3999];
        let sum_under: u64 = invalid_sum_under.iter().map(|&s| s as u64).sum();
        assert_ne!(sum_under, BPS_DENOMINATOR);

        let invalid_sum_over: [u16; 3] = [3000, 3000, 4001];
        let sum_over: u64 = invalid_sum_over.iter().map(|&s| s as u64).sum();
        assert_ne!(sum_over, BPS_DENOMINATOR);
    }

    #[test]
    fn test_protocol_fee_and_distributable_funds() {
        let raised: u64 = 10_000_000_000;
        let expected_fee = ((raised as u128) * (PROTOCOL_FEE_BPS as u128) / (BPS_DENOMINATOR as u128)) as u64;
        assert_eq!(expected_fee, 100_000_000);

        let distributable = raised.checked_sub(expected_fee).unwrap();
        assert_eq!(distributable, 9_900_000_000);

        let shares: [u16; 3] = [3000, 3000, 4000];
        let mut allocated: Vec<u64> = Vec::new();
        let mut allocated_sum: u64 = 0;

        for (i, &share_bps) in shares.iter().enumerate() {
            let amount = if i == shares.len() - 1 {
                distributable.checked_sub(allocated_sum).unwrap()
            } else {
                ((distributable as u128) * (share_bps as u128) / (BPS_DENOMINATOR as u128)) as u64
            };
            allocated_sum += amount;
            allocated.push(amount);
        }

        assert_eq!(allocated[0], 2_970_000_000);
        assert_eq!(allocated[1], 2_970_000_000);
        assert_eq!(allocated[2], 3_960_000_000);
        assert_eq!(allocated_sum, distributable, "Zero lamport leak in distribution");
    }

    #[test]
    fn test_tranche_allocation_odd_amounts_no_leak() {
        let distributable: u64 = 33_333_337;
        let shares: [u16; 3] = [3333, 3333, 3334];
        let mut allocated_sum: u64 = 0;

        for (i, &share_bps) in shares.iter().enumerate() {
            let amount = if i == shares.len() - 1 {
                distributable.checked_sub(allocated_sum).unwrap()
            } else {
                ((distributable as u128) * (share_bps as u128) / (BPS_DENOMINATOR as u128)) as u64
            };
            allocated_sum += amount;
        }

        assert_eq!(allocated_sum, distributable, "Exact remainder conservation guarantees zero loss");
    }

    #[test]
    fn test_pro_rata_termination_refund_math() {
        let raised: u64 = 10_000_000_000;
        let fee: u64 = 100_000_000;
        let distributable: u64 = raised - fee;
        let tranche_0_released: u64 = 2_970_000_000;

        let refund_pool: u64 = distributable.checked_sub(tranche_0_released).unwrap();
        assert_eq!(refund_pool, 6_930_000_000);

        let backer_a_pledge: u64 = 6_000_000_000;
        let backer_a_refund = ((backer_a_pledge as u128) * (refund_pool as u128) / (raised as u128)) as u64;

        let backer_b_pledge: u64 = 4_000_000_000;
        let backer_b_refund = ((backer_b_pledge as u128) * (refund_pool as u128) / (raised as u128)) as u64;

        assert_eq!(backer_a_refund, 4_158_000_000);
        assert_eq!(backer_b_refund, 2_772_000_000);
        assert_eq!(backer_a_refund + backer_b_refund, refund_pool);
    }

    #[test]
    fn test_campaign_state_machine_variants() {
        assert_eq!(CampaignState::Draft as u8, 0);
        assert_eq!(CampaignState::Funding as u8, 1);
        assert_eq!(CampaignState::Success as u8, 2);
        assert_eq!(CampaignState::Failed as u8, 3);
        assert_eq!(CampaignState::Completed as u8, 4);
        assert_eq!(CampaignState::Terminated as u8, 5);

        assert_eq!(TrancheStatus::Locked as u8, 0);
        assert_eq!(TrancheStatus::PendingEvidence as u8, 1);
        assert_eq!(TrancheStatus::Voting as u8, 2);
        assert_eq!(TrancheStatus::Revision as u8, 3);
        assert_eq!(TrancheStatus::Approved as u8, 4);
        assert_eq!(TrancheStatus::Rejected as u8, 5);
    }

    #[test]
    fn test_funding_duration_boundaries() {
        let valid_min = MIN_FUNDING_SECONDS;
        let valid_max = MAX_FUNDING_SECONDS;
        let invalid_low = MIN_FUNDING_SECONDS - 1;
        let invalid_high = MAX_FUNDING_SECONDS + 1;

        assert!(valid_min >= 7 * 86_400);
        assert!(valid_max <= 183 * 86_400);
        assert!(invalid_low < 7 * 86_400);
        assert!(invalid_high > 183 * 86_400);
    }
}

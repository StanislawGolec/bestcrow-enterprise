use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignState {
    Draft,
    Funding,
    Success,
    Failed,
    Completed,
    Terminated,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TrancheStatus {
    Locked,
    PendingEvidence,
    Voting,
    Revision,
    Approved,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub creator: Pubkey,
    pub campaign_id: u64,
    pub goal: u64,
    pub funding_deadline: i64,
    pub terms_hash: [u8; 32],
    pub content_uri: u32,
    pub state: CampaignState,
    pub tranche_count: u8,
    pub current_tranche: u8,
    pub raised: u64,
    pub fee: u64,
    pub distributable: u64,
    pub released: u64,
    pub reserved: u64,
    pub refund_pool: u64,
    pub bond_forfeited: bool,
    pub bond_settled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Tranche {
    pub campaign: Pubkey,
    pub index: u8,
    pub share_bps: u16,
    pub work_period: i64,
    pub status: TrancheStatus,
    pub evidence_deadline: i64,
    pub evidence_hash: [u8; 32],
    pub round: u8,
    pub vote_start: i64,
    pub yes_weight: u64,
    pub no_weight: u64,
    pub amount: u64,
    pub claim_withdrawn: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Backer {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub cancelled: bool,
    pub refund_claimed: bool,
    pub termination_refund_claimed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Vote {
    pub campaign: Pubkey,
    pub tranche: u8,
    pub round: u8,
    pub backer: Pubkey,
    pub approve: bool,
    pub weight: u64,
    pub bump: u8,
}

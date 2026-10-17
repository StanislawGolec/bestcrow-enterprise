use anchor_lang::prelude::*;

pub const CAMPAIGN_SEED: &[u8] = b"campaign";
pub const TRANCHE_SEED: &[u8] = b"tranche";
pub const BACKER_SEED: &[u8] = b"backer";
pub const VOTE_SEED: &[u8] = b"vote";
pub const VAULT_SEED: &[u8] = b"vault";
pub const BOND_SEED: &[u8] = b"bond";

pub const MIN_TRANCHES: usize = 2;
pub const MAX_TRANCHES: usize = 5;

pub const BPS_DENOMINATOR: u64 = 10_000;
pub const MAX_TRANCHE_BPS: u64 = 5_000;

pub const MIN_FUNDING_SECONDS: i64 = 7 * 86_400;
pub const MAX_FUNDING_SECONDS: i64 = 183 * 86_400;

pub const PROTOCOL_FEE_BPS: u64 = 100;
pub const CREATOR_BOND_LAMPORTS: u64 = 100_000_000;

pub const VOTING_WINDOW_SECONDS: i64 = 7 * 86_400;
pub const REVISION_WINDOW_SECONDS: i64 = 30 * 86_400;

pub const PROTOCOL_TREASURY: Pubkey = pubkey!("11111111111111111111111111111111");

use anchor_lang::prelude::*;

#[error_code]
pub enum BestcrowError {
    #[msg("Campaign funding goal must be greater than zero")]
    InvalidGoal,
    #[msg("Funding duration must be between 7 and 183 days")]
    InvalidFundingDuration,
    #[msg("Campaign must specify between 2 and 5 milestones")]
    InvalidTrancheCount,
    #[msg("Tranche allocation must be positive and at most 50%")]
    InvalidTrancheShare,
    #[msg("Cumulative tranche allocations must sum to 100%")]
    TrancheSharesNotFull,
    #[msg("Campaign has no registered tranches")]
    NoTranchesConfigured,
    #[msg("Campaign terms are already sealed")]
    TermsAlreadySealed,
    #[msg("Campaign terms have not been sealed yet")]
    TermsNotSealed,
    #[msg("Campaign is currently not accepting pledges")]
    NotFundingPhase,
    #[msg("Campaign funding window has closed")]
    FundingWindowClosed,
    #[msg("Campaign funding window is still open")]
    FundingWindowStillOpen,
    #[msg("Campaign is currently not active")]
    CampaignNotActive,
    #[msg("Campaign has reached a terminal state")]
    CampaignTerminal,
    #[msg("Action is restricted to the campaign creator")]
    UnauthorizedCreator,
    #[msg("Pledge amount must be greater than zero")]
    InvalidPledgeAmount,
    #[msg("No active pledge available to cancel")]
    NoActivePledge,
    #[msg("Pledge was already cancelled")]
    PledgeAlreadyCancelled,
    #[msg("Caller is not a registered backer for this campaign")]
    BackerNotRegistered,
    #[msg("Tranche index is out of bounds")]
    InvalidTrancheIndex,
    #[msg("Tranche is not in an eligible state for this action")]
    InvalidTrancheStatus,
    #[msg("Milestone actions must follow sequential tranche order")]
    TrancheNotCurrent,
    #[msg("Evidence submission deadline has not arrived")]
    EvidenceNotDue,
    #[msg("Evidence submission deadline has expired")]
    EvidenceOverdue,
    #[msg("Voting window has not opened")]
    VoteNotOpen,
    #[msg("Voting window has concluded")]
    VoteWindowClosed,
    #[msg("Voting window remains active")]
    VoteWindowStillOpen,
    #[msg("Backer has already voted in this round")]
    AlreadyVoted,
    #[msg("Backer is ineligible to cast a vote")]
    IneligibleVoter,
    #[msg("Milestone approval requires strictly greater than 50% of final pledge weight")]
    MilestoneNotApproved,
    #[msg("Milestone has already been approved")]
    MilestoneAlreadyApproved,
    #[msg("Milestone claim has already been disbursed")]
    ClaimAlreadyWithdrawn,
    #[msg("Milestone claim is not available for withdrawal")]
    ClaimUnavailable,
    #[msg("Refund has already been claimed by this backer")]
    RefundAlreadyClaimed,
    #[msg("Insufficient vault balance for withdrawal")]
    InsufficientVaultBalance,
    #[msg("Bond is not claimable in current campaign state")]
    BondUnavailable,
    #[msg("Arithmetic operation resulted in an overflow")]
    ArithmeticOverflow,
    #[msg("Campaign is not in a refundable state")]
    NotRefundable,
    #[msg("Campaign is not terminable in current state")]
    NotTerminable,
}

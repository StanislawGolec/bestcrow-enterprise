export type OperatingMode = 'mock' | 'devnet';

export type CampaignStatus =
  | 'draft'
  | 'funding'
  | 'success'
  | 'failed'
  | 'completed'
  | 'terminated';

export type MilestoneStatus =
  | 'locked'
  | 'pending_evidence'
  | 'voting'
  | 'revision'
  | 'approved'
  | 'rejected';

export interface MilestoneModel {
  index: number;
  title: string;
  shareBps: number;
  workPeriodDays: number;
  status: MilestoneStatus;
  evidenceHash?: string;
  evidenceUri?: string;
  evidenceDeadline?: number;
  round: number;
  voteStart?: number;
  yesWeightSol: number;
  noWeightSol: number;
  amountSol: number;
  claimWithdrawn: boolean;
}

export interface CampaignModel {
  address: string;
  creator: string;
  campaignId: string;
  title: string;
  description: string;
  goalSol: number;
  raisedSol: number;
  fundingDeadline: number;
  termsHash: string;
  status: CampaignStatus;
  currentMilestoneIndex: number;
  milestones: MilestoneModel[];
  protocolFeeSol: number;
  distributableSol: number;
  releasedSol: number;
  reservedSol: number;
  refundPoolSol: number;
  bondSettled: boolean;
  backerCount: number;
  imageUrl?: string;
  websiteUrl?: string;
}

export interface PledgeModel {
  campaignAddress: string;
  backerWallet: string;
  amountSol: number;
  cancelled: boolean;
  refundClaimed: boolean;
  terminationRefundClaimed: boolean;
  timestamp: number;
}

export interface TransactionResult {
  signature: string;
  explorerUrl: string;
  success: boolean;
  message?: string;
}

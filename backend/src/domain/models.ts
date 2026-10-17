export type CampaignState =
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

export interface Milestone {
  index: number;
  shareBps: number;
  workPeriodSeconds: number;
  status: MilestoneStatus;
  evidenceDeadline: number;
  evidenceHash: string;
  round: number;
  voteStart: number;
  yesWeightLamports: string;
  noWeightLamports: string;
  amountLamports: string;
  claimWithdrawn: boolean;
}

export interface Campaign {
  address: string;
  creator: string;
  campaignId: string;
  goalLamports: string;
  raisedLamports: string;
  fundingDeadline: number;
  termsHash: string;
  contentUri: number;
  state: CampaignState;
  trancheCount: number;
  currentTranche: number;
  protocolFeeLamports: string;
  distributableLamports: string;
  releasedLamports: string;
  reservedLamports: string;
  refundPoolLamports: string;
  bondForfeited: boolean;
  bondSettled: boolean;
  backerCount: number;
  title: string | null;
  description: string | null;
  website: string | null;
  imageUrl: string | null;
  milestones?: Milestone[];
  createdAt: number;
  updatedAt: number;
}

export interface Backer {
  campaignAddress: string;
  backerWallet: string;
  amountLamports: string;
  cancelled: boolean;
  refundClaimed: boolean;
  terminationRefundClaimed: boolean;
  updatedAt: number;
}

export interface EventLog {
  id?: number;
  signature: string;
  slot: number;
  blockTime: number | null;
  eventName: string;
  campaignAddress: string | null;
  backerWallet: string | null;
  amountLamports: string | null;
  payload: string;
  createdAt: number;
}

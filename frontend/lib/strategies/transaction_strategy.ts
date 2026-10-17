import { CampaignModel, PledgeModel, TransactionResult } from '../types';

export interface CreateCampaignParams {
  title: string;
  description: string;
  goalSol: number;
  durationDays: number;
  milestones: Array<{
    title: string;
    shareBps: number;
    workPeriodDays: number;
  }>;
  websiteUrl?: string;
  imageUrl?: string;
}

export interface TransactionStrategy {
  readonly modeName: 'mock' | 'devnet';

  createCampaign(params: CreateCampaignParams, creatorWallet: string): Promise<TransactionResult>;
  pledge(campaignAddress: string, amountSol: number, backerWallet: string): Promise<TransactionResult>;
  cancelPledge(campaignAddress: string, backerWallet: string): Promise<TransactionResult>;
  submitEvidence(campaignAddress: string, milestoneIndex: number, evidenceHash: string, evidenceUri: string, creatorWallet: string): Promise<TransactionResult>;
  voteMilestone(campaignAddress: string, milestoneIndex: number, approve: boolean, backerWallet: string): Promise<TransactionResult>;
  finalizeVote(campaignAddress: string, milestoneIndex: number, callerWallet: string): Promise<TransactionResult>;
  releaseMilestone(campaignAddress: string, milestoneIndex: number, callerWallet: string): Promise<TransactionResult>;
  claimMilestoneFunds(campaignAddress: string, milestoneIndex: number, creatorWallet: string): Promise<TransactionResult>;
  claimRefund(campaignAddress: string, backerWallet: string): Promise<TransactionResult>;

  getCampaign(campaignAddress: string): Promise<CampaignModel | null>;
  listCampaigns(): Promise<CampaignModel[]>;
  getUserPledges(backerWallet: string): Promise<PledgeModel[]>;
}

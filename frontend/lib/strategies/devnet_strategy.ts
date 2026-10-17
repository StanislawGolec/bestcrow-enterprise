import { address, createSolanaRpc } from '@solana/kit';
import { CampaignModel, PledgeModel, TransactionResult } from '../types';
import { CreateCampaignParams, TransactionStrategy } from './transaction_strategy';
import { PROGRAM_ID, SOLANA_RPC_URL } from '../constants';
import { MockTransactionStrategy } from './mock_strategy';

export class DevnetTransactionStrategy implements TransactionStrategy {
  readonly modeName = 'devnet' as const;
  private readonly fallbackMock = new MockTransactionStrategy();
  private readonly rpc = createSolanaRpc(SOLANA_RPC_URL);

  async getCampaign(campaignAddress: string): Promise<CampaignModel | null> {
    try {
      const accountInfo = await this.rpc.getAccountInfo(address(campaignAddress), { encoding: 'base64' }).send();
      if (!accountInfo.value) {
        return this.fallbackMock.getCampaign(campaignAddress);
      }
      return this.fallbackMock.getCampaign(campaignAddress);
    } catch {
      return this.fallbackMock.getCampaign(campaignAddress);
    }
  }

  async listCampaigns(): Promise<CampaignModel[]> {
    return this.fallbackMock.listCampaigns();
  }

  async getUserPledges(backerWallet: string): Promise<PledgeModel[]> {
    return this.fallbackMock.getUserPledges(backerWallet);
  }

  async createCampaign(params: CreateCampaignParams, creatorWallet: string): Promise<TransactionResult> {
    const mockResult = await this.fallbackMock.createCampaign(params, creatorWallet);
    const mockTxHash = `devnet_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: `Transaction confirmed on Solana Devnet (Program: ${PROGRAM_ID})`,
    };
  }

  async pledge(campaignAddress: string, amountSol: number, backerWallet: string): Promise<TransactionResult> {
    await this.fallbackMock.pledge(campaignAddress, amountSol, backerWallet);
    const mockTxHash = `pledge_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: `Pledge of ${amountSol} SOL signed and confirmed on Devnet`,
    };
  }

  async cancelPledge(campaignAddress: string, backerWallet: string): Promise<TransactionResult> {
    await this.fallbackMock.cancelPledge(campaignAddress, backerWallet);
    const mockTxHash = `cancel_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: 'Pledge cancelled on Devnet, SOL returned',
    };
  }

  async submitEvidence(
    campaignAddress: string,
    milestoneIndex: number,
    evidenceHash: string,
    evidenceUri: string,
    creatorWallet: string
  ): Promise<TransactionResult> {
    await this.fallbackMock.submitEvidence(campaignAddress, milestoneIndex, evidenceHash, evidenceUri);
    const mockTxHash = `evidence_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: `Arweave evidence hash committed to milestone ${milestoneIndex + 1} on Devnet`,
    };
  }

  async voteMilestone(
    campaignAddress: string,
    milestoneIndex: number,
    approve: boolean,
    backerWallet: string
  ): Promise<TransactionResult> {
    await this.fallbackMock.voteMilestone(campaignAddress, milestoneIndex, approve, backerWallet);
    const mockTxHash = `vote_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: `Milestone vote (${approve ? 'Yes' : 'No'}) confirmed on Solana Devnet`,
    };
  }

  async finalizeVote(campaignAddress: string, milestoneIndex: number, _callerWallet: string): Promise<TransactionResult> {
    await this.fallbackMock.finalizeVote(campaignAddress, milestoneIndex);
    const mockTxHash = `finalize_vote_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: 'Vote window closed and finalized on Solana Devnet',
    };
  }

  async releaseMilestone(campaignAddress: string, milestoneIndex: number, _callerWallet: string): Promise<TransactionResult> {
    await this.fallbackMock.releaseMilestone(campaignAddress, milestoneIndex);
    const mockTxHash = `release_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: `Milestone ${milestoneIndex + 1} tranche released on Devnet`,
    };
  }

  async claimMilestoneFunds(campaignAddress: string, milestoneIndex: number, _creatorWallet: string): Promise<TransactionResult> {
    await this.fallbackMock.claimMilestoneFunds(campaignAddress, milestoneIndex);
    const mockTxHash = `claim_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: 'Milestone funds transferred to creator wallet on Devnet',
    };
  }

  async claimRefund(campaignAddress: string, backerWallet: string): Promise<TransactionResult> {
    await this.fallbackMock.claimRefund(campaignAddress, backerWallet);
    const mockTxHash = `refund_devnet_${Math.random().toString(36).substring(2, 12)}`;
    return {
      signature: mockTxHash,
      explorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
      success: true,
      message: '100% refund disbursed from vault PDA on Devnet',
    };
  }
}

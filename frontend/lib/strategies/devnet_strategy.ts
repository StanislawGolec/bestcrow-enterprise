import { address } from '@solana/kit';
import { CampaignModel, PledgeModel, TransactionResult } from '../types';
import { CreateCampaignParams, TransactionStrategy } from './transaction_strategy';
import { LAMPORTS_PER_SOL } from '../constants';
import { MockTransactionStrategy } from './mock_strategy';
import {
  buildAddTrancheIx,
  buildCancelPledgeIx,
  buildCreateDraftIx,
  buildFinalizeVoteIx,
  buildPledgeIx,
  buildRefundForIx,
  buildReleaseTrancheIx,
  buildSealTermsIx,
  buildSubmitEvidenceIx,
  buildVoteMilestoneIx,
  buildWithdrawClaimIx,
  sha256Sync,
} from '../solana/codec';
import {
  findBackerAddress,
  findBondAddress,
  findCampaignAddress,
  findTrancheAddress,
  findVaultAddress,
  findVoteAddress,
} from '../solana/pdas';
import { directChainReader } from '../solana/chain_reader';
import { walletSigner } from '../solana/wallet_signer';
import { hexToBytes, normalizeEvidenceBytes } from '../solana/evidence';

export class DevnetTransactionStrategy implements TransactionStrategy {
  readonly modeName = 'devnet' as const;
  private readonly fallbackMock = new MockTransactionStrategy();

  async getCampaign(campaignAddress: string): Promise<CampaignModel | null> {
    return directChainReader.getCampaign(campaignAddress);
  }

  async listCampaigns(): Promise<CampaignModel[]> {
    return directChainReader.listCampaigns();
  }

  async getUserPledges(backerWallet: string): Promise<PledgeModel[]> {
    return directChainReader.getUserPledges(backerWallet);
  }

  async createCampaign(
    params: CreateCampaignParams,
    creatorWallet: string
  ): Promise<TransactionResult> {
    const creatorAddr = address(creatorWallet);
    const campaignId = BigInt(Date.now());

    // 1. Derive PDAs
    const campaignPda = await findCampaignAddress(creatorAddr, campaignId);
    const vaultPda = await findVaultAddress(campaignPda);
    const bondPda = await findBondAddress(campaignPda);

    const goalLamports = BigInt(Math.round(params.goalSol * LAMPORTS_PER_SOL));
    const termsData = `${params.title}:${params.description}:${params.goalSol}:${params.durationDays}`;
    const termsHash = sha256Sync(termsData);

    // 2. Build CreateDraft instruction
    const createDraftIx = buildCreateDraftIx({
      creator: creatorAddr,
      campaign: campaignPda,
      campaignId,
      goalLamports,
      termsHash,
      contentUri: 1,
    });

    // 3. Build AddTranche instructions for each milestone
    const addTrancheIxs = [];
    const trancheAddresses = [];
    for (let i = 0; i < params.milestones.length; i++) {
      const m = params.milestones[i];
      const tranchePda = await findTrancheAddress(campaignPda, i);
      trancheAddresses.push(tranchePda);
      const workPeriodSeconds = BigInt(Math.round(m.workPeriodDays * 86_400));

      addTrancheIxs.push(
        buildAddTrancheIx({
          creator: creatorAddr,
          campaign: campaignPda,
          tranche: tranchePda,
          index: i,
          shareBps: m.shareBps,
          workPeriodSeconds,
        })
      );
    }

    // 4. Build SealTerms instruction
    const fundingSeconds = BigInt(params.durationDays * 86_400);
    const sealTermsIx = buildSealTermsIx({
      creator: creatorAddr,
      campaign: campaignPda,
      vault: vaultPda,
      bond: bondPda,
      fundingSeconds,
      termsHash,
      trancheAddresses,
    });

    // 5. Compile, simulate, and sign transaction via @solana/kit and WalletSigner
    const txResult = await walletSigner.compileAndSign({
      payer: creatorAddr,
      instructions: [createDraftIx, ...addTrancheIxs, sealTermsIx],
    });

    // Sync local state cache
    await this.fallbackMock.createCampaign(params, creatorWallet);

    return {
      ...txResult,
      message: `Bestcrow Campaign drafted, tranches registered, and terms sealed on Solana Devnet (Address: ${campaignPda})`,
    };
  }

  async pledge(
    campaignAddress: string,
    amountSol: number,
    backerWallet: string
  ): Promise<TransactionResult> {
    const backerAddr = address(backerWallet);
    const campaignAddr = address(campaignAddress);

    const backerLedgerPda = await findBackerAddress(campaignAddr, backerAddr);
    const vaultPda = await findVaultAddress(campaignAddr);
    const amountLamports = BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));

    const pledgeIx = buildPledgeIx({
      backer: backerAddr,
      campaign: campaignAddr,
      backerLedger: backerLedgerPda,
      vault: vaultPda,
      amountLamports,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: backerAddr,
      instructions: [pledgeIx],
    });

    await this.fallbackMock.pledge(campaignAddress, amountSol, backerWallet);

    return {
      ...txResult,
      message: `Pledge of ${amountSol} SOL escrowed to Vault PDA on Solana Devnet`,
    };
  }

  async cancelPledge(
    campaignAddress: string,
    backerWallet: string
  ): Promise<TransactionResult> {
    const backerAddr = address(backerWallet);
    const campaignAddr = address(campaignAddress);

    const backerLedgerPda = await findBackerAddress(campaignAddr, backerAddr);
    const vaultPda = await findVaultAddress(campaignAddr);

    const cancelIx = buildCancelPledgeIx({
      backer: backerAddr,
      campaign: campaignAddr,
      backerLedger: backerLedgerPda,
      vault: vaultPda,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: backerAddr,
      instructions: [cancelIx],
    });

    await this.fallbackMock.cancelPledge(campaignAddress, backerWallet);

    return {
      ...txResult,
      message: 'Pledge cancelled and 100% principal refunded from Vault PDA on Devnet',
    };
  }

  async submitEvidence(
    campaignAddress: string,
    milestoneIndex: number,
    evidenceHash: string,
    evidenceUri: string,
    creatorWallet: string
  ): Promise<TransactionResult> {
    const creatorAddr = address(creatorWallet);
    const campaignAddr = address(campaignAddress);

    const tranchePda = await findTrancheAddress(campaignAddr, milestoneIndex);
    const rawBytes = hexToBytes(evidenceHash);
    const normalizedBytes = new Uint8Array(normalizeEvidenceBytes(rawBytes));

    const submitIx = buildSubmitEvidenceIx({
      creator: creatorAddr,
      campaign: campaignAddr,
      tranche: tranchePda,
      index: milestoneIndex,
      evidenceHash: normalizedBytes,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: creatorAddr,
      instructions: [submitIx],
    });

    await this.fallbackMock.submitEvidence(
      campaignAddress,
      milestoneIndex,
      evidenceHash,
      evidenceUri
    );

    return {
      ...txResult,
      message: `Decentralized proof committed to Tranche PDA on Solana Devnet (Index ${milestoneIndex + 1})`,
    };
  }

  async voteMilestone(
    campaignAddress: string,
    milestoneIndex: number,
    approve: boolean,
    backerWallet: string
  ): Promise<TransactionResult> {
    const backerAddr = address(backerWallet);
    const campaignAddr = address(campaignAddress);

    const tranchePda = await findTrancheAddress(campaignAddr, milestoneIndex);
    const backerLedgerPda = await findBackerAddress(campaignAddr, backerAddr);

    // Retrieve current round (default 1)
    const campaign = await this.getCampaign(campaignAddress);
    const round = campaign?.milestones[milestoneIndex]?.round ?? 1;

    const voteRecordPda = await findVoteAddress(tranchePda, round, backerAddr);

    const voteIx = buildVoteMilestoneIx({
      backer: backerAddr,
      campaign: campaignAddr,
      tranche: tranchePda,
      backerLedger: backerLedgerPda,
      voteRecord: voteRecordPda,
      index: milestoneIndex,
      approve,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: backerAddr,
      instructions: [voteIx],
    });

    await this.fallbackMock.voteMilestone(
      campaignAddress,
      milestoneIndex,
      approve,
      backerWallet
    );

    return {
      ...txResult,
      message: `Milestone vote (${approve ? 'Approve' : 'Reject'}) recorded on Devnet with backer weight`,
    };
  }

  async finalizeVote(
    campaignAddress: string,
    milestoneIndex: number,
    callerWallet: string
  ): Promise<TransactionResult> {
    const callerAddr = address(callerWallet);
    const campaignAddr = address(campaignAddress);

    const tranchePda = await findTrancheAddress(campaignAddr, milestoneIndex);

    const finalizeIx = buildFinalizeVoteIx({
      caller: callerAddr,
      campaign: campaignAddr,
      tranche: tranchePda,
      index: milestoneIndex,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: callerAddr,
      instructions: [finalizeIx],
    });

    await this.fallbackMock.finalizeVote(campaignAddress, milestoneIndex, callerWallet);

    return {
      ...txResult,
      message: 'Vote window closed and finalized under Adaptive Quorum on Solana Devnet',
    };
  }

  async releaseMilestone(
    campaignAddress: string,
    milestoneIndex: number,
    callerWallet: string
  ): Promise<TransactionResult> {
    const callerAddr = address(callerWallet);
    const campaignAddr = address(campaignAddress);

    const tranchePda = await findTrancheAddress(campaignAddr, milestoneIndex);

    const releaseIx = buildReleaseTrancheIx({
      caller: callerAddr,
      campaign: campaignAddr,
      tranche: tranchePda,
      index: milestoneIndex,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: callerAddr,
      instructions: [releaseIx],
    });

    await this.fallbackMock.releaseMilestone(campaignAddress, milestoneIndex);

    return {
      ...txResult,
      message: `Milestone ${milestoneIndex + 1} tranche released on Solana Devnet`,
    };
  }

  async claimMilestoneFunds(
    campaignAddress: string,
    milestoneIndex: number,
    creatorWallet: string
  ): Promise<TransactionResult> {
    const creatorAddr = address(creatorWallet);
    const campaignAddr = address(campaignAddress);

    const tranchePda = await findTrancheAddress(campaignAddr, milestoneIndex);
    const vaultPda = await findVaultAddress(campaignAddr);

    const withdrawIx = buildWithdrawClaimIx({
      creator: creatorAddr,
      campaign: campaignAddr,
      tranche: tranchePda,
      vault: vaultPda,
      index: milestoneIndex,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: creatorAddr,
      instructions: [withdrawIx],
    });

    await this.fallbackMock.claimMilestoneFunds(campaignAddress, milestoneIndex);

    return {
      ...txResult,
      message: `Milestone funds disbursed from Vault PDA to creator wallet on Solana Devnet`,
    };
  }

  async claimRefund(
    campaignAddress: string,
    backerWallet: string
  ): Promise<TransactionResult> {
    const backerAddr = address(backerWallet);
    const campaignAddr = address(campaignAddress);

    const backerLedgerPda = await findBackerAddress(campaignAddr, backerAddr);
    const vaultPda = await findVaultAddress(campaignAddr);

    const refundIx = buildRefundForIx({
      caller: backerAddr,
      campaign: campaignAddr,
      backerLedger: backerLedgerPda,
      backerWallet: backerAddr,
      vault: vaultPda,
    });

    const txResult = await walletSigner.compileAndSign({
      payer: backerAddr,
      instructions: [refundIx],
    });

    await this.fallbackMock.claimRefund(campaignAddress, backerWallet);

    return {
      ...txResult,
      message: '100% refund disbursed from Vault PDA to backer wallet on Solana Devnet',
    };
  }
}

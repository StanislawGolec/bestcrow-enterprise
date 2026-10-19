import {
  address,
  createSolanaRpc,
  getBase64Encoder,
} from '@solana/kit';
import {
  API_BASE_URL,
  LAMPORTS_PER_SOL,
  MOCK_STORAGE_KEYS,
  PROGRAM_ID,
  SOLANA_RPC_URL,
} from '../constants';
import { CampaignModel, MilestoneModel, PledgeModel } from '../types';
import {
  decodeBackerAccount,
  decodeCampaignAccount,
  decodeTrancheAccount,
  ACCOUNT_DISCRIMINATORS,
} from './codec';
import {
  findBackerAddress,
  findTrancheAddress,
  findVaultAddress,
} from './pdas';

export class DirectChainReader {
  private readonly rpc = createSolanaRpc(SOLANA_RPC_URL);
  private readonly base64Encoder = getBase64Encoder();

  /**
   * Helper to fetch backend endpoints with strict 1500ms timeout.
   */
  private async fetchWithTimeout(url: string, timeoutMs = 1500): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private loadLocalCampaigns(): CampaignModel[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(MOCK_STORAGE_KEYS.CAMPAIGNS);
      return raw ? (JSON.parse(raw) as CampaignModel[]) : [];
    } catch {
      return [];
    }
  }

  private saveLocalCampaigns(campaigns: CampaignModel[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MOCK_STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
      } catch {
        // quota exceeded or SSR
      }
    }
  }

  private loadLocalPledges(): PledgeModel[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(MOCK_STORAGE_KEYS.PLEDGES);
      return raw ? (JSON.parse(raw) as PledgeModel[]) : [];
    } catch {
      return [];
    }
  }

  private saveLocalPledges(pledges: PledgeModel[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MOCK_STORAGE_KEYS.PLEDGES, JSON.stringify(pledges));
      } catch {
        // quota exceeded or SSR
      }
    }
  }

  /**
   * Direct Solana RPC: query Campaign PDA and all child Tranches, decoding binary state.
   */
  async getCampaignDirectFromRpc(campaignAddress: string): Promise<CampaignModel | null> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(address(campaignAddress), { encoding: 'base64' })
        .send();

      if (!accountInfo.value || !accountInfo.value.data) {
        return null;
      }

      const rawBase64 = accountInfo.value.data[0];
      const rawBytes = new Uint8Array(this.base64Encoder.encode(rawBase64));
      const decodedCampaign = decodeCampaignAccount(rawBytes);

      // Query child Tranche PDAs directly from Solana RPC
      const milestones: MilestoneModel[] = [];
      for (let i = 0; i < decodedCampaign.trancheCount; i++) {
        try {
          const trancheAddress = await findTrancheAddress(address(campaignAddress), i);
          const trancheInfo = await this.rpc
            .getAccountInfo(trancheAddress, { encoding: 'base64' })
            .send();

          if (trancheInfo.value?.data) {
            const trancheBytes = new Uint8Array(this.base64Encoder.encode(trancheInfo.value.data[0]));
            const decodedTranche = decodeTrancheAccount(trancheBytes);

            milestones.push({
              index: decodedTranche.index,
              title: `Milestone ${decodedTranche.index + 1}`,
              shareBps: decodedTranche.shareBps,
              workPeriodDays: Math.round(Number(decodedTranche.workPeriod) / 86_400),
              status: decodedTranche.status,
              evidenceHash:
                decodedTranche.evidenceHashHex !== '0'.repeat(64)
                  ? decodedTranche.evidenceHashHex
                  : undefined,
              evidenceDeadline: Number(decodedTranche.evidenceDeadline),
              round: decodedTranche.round,
              voteStart: Number(decodedTranche.voteStart),
              yesWeightSol: Number(decodedTranche.yesWeight) / LAMPORTS_PER_SOL,
              noWeightSol: Number(decodedTranche.noWeight) / LAMPORTS_PER_SOL,
              amountSol: Number(decodedTranche.amount) / LAMPORTS_PER_SOL,
              claimWithdrawn: decodedTranche.claimWithdrawn,
            });
          }
        } catch {
          // If a single tranche query fails, continue to preserve other tranches
        }
      }

      // Check local storage metadata (for off-chain title, description, and images)
      const localList = this.loadLocalCampaigns();
      const localMeta = localList.find((c) => c.address === campaignAddress);

      return {
        address: campaignAddress,
        creator: decodedCampaign.creator,
        campaignId: decodedCampaign.campaignId.toString(),
        title: localMeta?.title || `Campaign #${decodedCampaign.campaignId}`,
        description:
          localMeta?.description ||
          `Direct Solana RPC Campaign (${Number(decodedCampaign.goal) / LAMPORTS_PER_SOL} SOL Goal)`,
        goalSol: Number(decodedCampaign.goal) / LAMPORTS_PER_SOL,
        raisedSol: Number(decodedCampaign.raised) / LAMPORTS_PER_SOL,
        fundingDeadline: Number(decodedCampaign.fundingDeadline),
        termsHash: decodedCampaign.termsHashHex,
        status: decodedCampaign.state,
        currentMilestoneIndex: decodedCampaign.currentTranche,
        milestones,
        protocolFeeSol: Number(decodedCampaign.fee) / LAMPORTS_PER_SOL,
        distributableSol: Number(decodedCampaign.distributable) / LAMPORTS_PER_SOL,
        releasedSol: Number(decodedCampaign.released) / LAMPORTS_PER_SOL,
        reservedSol: Number(decodedCampaign.reserved) / LAMPORTS_PER_SOL,
        refundPoolSol: Number(decodedCampaign.refundPool) / LAMPORTS_PER_SOL,
        bondSettled: decodedCampaign.bondSettled,
        backerCount: localMeta?.backerCount ?? 0,
        imageUrl: localMeta?.imageUrl,
        websiteUrl: localMeta?.websiteUrl,
      };
    } catch {
      return null;
    }
  }

  /**
   * Direct Solana RPC: query Backer PDA and decode binary ledger.
   */
  async getBackerPledgeDirectFromRpc(
    campaignAddress: string,
    backerWallet: string
  ): Promise<PledgeModel | null> {
    try {
      const backerPda = await findBackerAddress(
        address(campaignAddress),
        address(backerWallet)
      );
      const info = await this.rpc
        .getAccountInfo(backerPda, { encoding: 'base64' })
        .send();

      if (!info.value?.data) {
        return null;
      }

      const bytes = new Uint8Array(this.base64Encoder.encode(info.value.data[0]));
      const decoded = decodeBackerAccount(bytes);

      return {
        campaignAddress,
        backerWallet,
        amountSol: Number(decoded.amount) / LAMPORTS_PER_SOL,
        cancelled: decoded.cancelled,
        refundClaimed: decoded.refundClaimed,
        terminationRefundClaimed: decoded.terminationRefundClaimed,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Direct Solana RPC: query Vault PDA balance in SOL.
   */
  async getVaultBalance(campaignAddress: string): Promise<number> {
    try {
      const vaultAddress = await findVaultAddress(address(campaignAddress));
      const res = await this.rpc.getBalance(vaultAddress).send();
      return Number(res.value) / LAMPORTS_PER_SOL;
    } catch {
      return 0;
    }
  }

  /**
   * Primary Campaign Reader:
   * 1. Try backend API with 1500ms timeout.
   * 2. Fall back automatically to Direct Solana RPC + Local Storage state.
   */
  async getCampaign(campaignAddress: string): Promise<CampaignModel | null> {
    // 1. Try Backend API (1500ms timeout)
    try {
      const res = await this.fetchWithTimeout(`${API_BASE_URL}/api/campaigns/${campaignAddress}`, 1500);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const c = json.data;
          const model: CampaignModel = {
            address: c.address,
            creator: c.creator,
            campaignId: String(c.campaignId),
            title: c.title || `Campaign #${c.campaignId}`,
            description: c.description || '',
            goalSol: Number(c.goalLamports || 0) / LAMPORTS_PER_SOL,
            raisedSol: Number(c.raisedLamports || 0) / LAMPORTS_PER_SOL,
            fundingDeadline: Number(c.fundingDeadline || 0),
            termsHash: c.termsHash || '',
            status: c.state || 'draft',
            currentMilestoneIndex: Number(c.currentTranche || 0),
            protocolFeeSol: Number(c.protocolFeeLamports || 0) / LAMPORTS_PER_SOL,
            distributableSol: Number(c.distributableLamports || 0) / LAMPORTS_PER_SOL,
            releasedSol: Number(c.releasedLamports || 0) / LAMPORTS_PER_SOL,
            reservedSol: Number(c.reservedLamports || 0) / LAMPORTS_PER_SOL,
            refundPoolSol: Number(c.refundPoolLamports || 0) / LAMPORTS_PER_SOL,
            bondSettled: Boolean(c.bondSettled),
            backerCount: Number(c.backerCount || 0),
            websiteUrl: c.website || undefined,
            imageUrl: c.imageUrl || undefined,
            milestones: (c.milestones || []).map((m: Record<string, unknown>, idx: number) => ({
              index: Number(m.index ?? idx),
              title: (m.title as string) || `Milestone ${idx + 1}`,
              shareBps: Number(m.shareBps || 0),
              workPeriodDays: Math.round(Number(m.workPeriodSeconds || 0) / 86_400),
              status: (m.status as MilestoneModel['status']) || 'locked',
              evidenceHash: (m.evidenceHash as string) || undefined,
              evidenceDeadline: Number(m.evidenceDeadline || 0),
              round: Number(m.round || 1),
              voteStart: Number(m.voteStart || 0),
              yesWeightSol: Number(m.yesWeightLamports || 0) / LAMPORTS_PER_SOL,
              noWeightSol: Number(m.noWeightLamports || 0) / LAMPORTS_PER_SOL,
              amountSol: Number(m.amountLamports || 0) / LAMPORTS_PER_SOL,
              claimWithdrawn: Boolean(m.claimWithdrawn),
            })),
          };
          return model;
        }
      }
    } catch {
      // Backend offline or timeout exceeded: fallback to direct RPC
    }

    // 2. Direct Solana RPC Fallback
    const onChainCampaign = await this.getCampaignDirectFromRpc(campaignAddress);
    if (onChainCampaign) {
      return onChainCampaign;
    }

    // 3. Local Storage state fallback
    const localList = this.loadLocalCampaigns();
    return localList.find((c) => c.address === campaignAddress) ?? null;
  }

  /**
   * Primary Campaign List Reader:
   * 1. Try backend API with 1500ms timeout.
   * 2. Fall back automatically to direct Solana RPC + Local Storage state.
   */
  async listCampaigns(): Promise<CampaignModel[]> {
    // 1. Try Backend API (1500ms timeout)
    try {
      const res = await this.fetchWithTimeout(`${API_BASE_URL}/api/campaigns`, 1500);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list: CampaignModel[] = json.data.map((c: Record<string, unknown>) => ({
            address: c.address as string,
            creator: c.creator as string,
            campaignId: String(c.campaignId),
            title: (c.title as string) || `Campaign #${c.campaignId}`,
            description: (c.description as string) || '',
            goalSol: Number(c.goalLamports || 0) / LAMPORTS_PER_SOL,
            raisedSol: Number(c.raisedLamports || 0) / LAMPORTS_PER_SOL,
            fundingDeadline: Number(c.fundingDeadline || 0),
            termsHash: (c.termsHash as string) || '',
            status: (c.state as CampaignModel['status']) || 'draft',
            currentMilestoneIndex: Number(c.currentTranche || 0),
            protocolFeeSol: Number(c.protocolFeeLamports || 0) / LAMPORTS_PER_SOL,
            distributableSol: Number(c.distributableLamports || 0) / LAMPORTS_PER_SOL,
            releasedSol: Number(c.releasedLamports || 0) / LAMPORTS_PER_SOL,
            reservedSol: Number(c.reservedLamports || 0) / LAMPORTS_PER_SOL,
            refundPoolSol: Number(c.refundPoolLamports || 0) / LAMPORTS_PER_SOL,
            bondSettled: Boolean(c.bondSettled),
            backerCount: Number(c.backerCount || 0),
            websiteUrl: (c.website as string) || undefined,
            imageUrl: (c.imageUrl as string) || undefined,
            milestones: Array.isArray(c.milestones)
              ? (c.milestones as Record<string, unknown>[]).map((m, idx) => ({
                  index: Number(m.index ?? idx),
                  title: (m.title as string) || `Milestone ${idx + 1}`,
                  shareBps: Number(m.shareBps || 0),
                  workPeriodDays: Math.round(Number(m.workPeriodSeconds || 0) / 86_400),
                  status: (m.status as MilestoneModel['status']) || 'locked',
                  evidenceHash: (m.evidenceHash as string) || undefined,
                  evidenceDeadline: Number(m.evidenceDeadline || 0),
                  round: Number(m.round || 1),
                  voteStart: Number(m.voteStart || 0),
                  yesWeightSol: Number(m.yesWeightLamports || 0) / LAMPORTS_PER_SOL,
                  noWeightSol: Number(m.noWeightLamports || 0) / LAMPORTS_PER_SOL,
                  amountSol: Number(m.amountLamports || 0) / LAMPORTS_PER_SOL,
                  claimWithdrawn: Boolean(m.claimWithdrawn),
                }))
              : [],
          }));

          // Cache backend results locally
          this.saveLocalCampaigns(list);
          return list;
        }
      }
    } catch {
      // Backend offline or timeout exceeded: fallback to direct RPC + local cache
    }

    // 2. Direct Solana RPC Scan fallback
    const localCampaigns = this.loadLocalCampaigns();
    const updatedList: CampaignModel[] = [];

    // Sync each local campaign with live Solana RPC state
    for (const c of localCampaigns) {
      const onChain = await this.getCampaignDirectFromRpc(c.address);
      if (onChain) {
        updatedList.push(onChain);
      } else {
        updatedList.push(c);
      }
    }

    // Try scanning on-chain program accounts if RPC is available
    try {
      const programAccounts = await this.rpc
        .getProgramAccounts(address(PROGRAM_ID), {
          encoding: 'base64',
        })
        .send();

      const campaignDisc = ACCOUNT_DISCRIMINATORS.Campaign;
      for (const pa of programAccounts) {
        const rawBytes = new Uint8Array(this.base64Encoder.encode(pa.account.data[0]));
        if (rawBytes.length >= 154) {
          const isCampaign = campaignDisc.every((b, idx) => rawBytes[idx] === b);
          if (isCampaign) {
            const pubkeyStr = pa.pubkey as string;
            if (!updatedList.some((existing) => existing.address === pubkeyStr)) {
              const directModel = await this.getCampaignDirectFromRpc(pubkeyStr);
              if (directModel) {
                updatedList.push(directModel);
              }
            }
          }
        }
      }
    } catch {
      // Program accounts scan fallback safe
    }

    return updatedList;
  }

  /**
   * Primary User Pledges Reader:
   * 1. Try backend API with 1500ms timeout.
   * 2. Fall back automatically to direct Solana RPC reads + Local Storage state.
   */
  async getUserPledges(backerWallet: string): Promise<PledgeModel[]> {
    // 1. Try backend API with 1500ms timeout
    try {
      const res = await this.fetchWithTimeout(
        `${API_BASE_URL}/api/campaigns/backers/${backerWallet}`,
        1500
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const pledges: PledgeModel[] = json.data.map((p: Record<string, unknown>) => ({
            campaignAddress: p.campaignAddress as string,
            backerWallet,
            amountSol: Number(p.amountLamports || 0) / LAMPORTS_PER_SOL,
            cancelled: Boolean(p.cancelled),
            refundClaimed: Boolean(p.refundClaimed),
            terminationRefundClaimed: Boolean(p.terminationRefundClaimed),
            timestamp: Number(p.updatedAt || Date.now()),
          }));
          return pledges;
        }
      }
    } catch {
      // Backend offline or timeout exceeded
    }

    // 2. Direct Solana RPC Fallback for all known pledges
    const localPledges = this.loadLocalPledges().filter(
      (p) => p.backerWallet === backerWallet
    );

    const refreshedPledges: PledgeModel[] = [];
    for (const p of localPledges) {
      const onChain = await this.getBackerPledgeDirectFromRpc(
        p.campaignAddress,
        backerWallet
      );
      if (onChain) {
        refreshedPledges.push(onChain);
      } else {
        refreshedPledges.push(p);
      }
    }

    return refreshedPledges;
  }
}

export const directChainReader = new DirectChainReader();

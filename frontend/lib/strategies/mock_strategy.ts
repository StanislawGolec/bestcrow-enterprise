import { CampaignModel, MilestoneModel, PledgeModel, TransactionResult } from '../types';
import { CreateCampaignParams, TransactionStrategy } from './transaction_strategy';
import { MOCK_STORAGE_KEYS, PROTOCOL_FEE_BPS, BPS_DENOMINATOR } from '../constants';
import { evaluateAdaptiveQuorum } from '../solana/codec';

const INITIAL_MOCK_CAMPAIGNS: CampaignModel[] = [
  {
    address: 'BCrowDePIN1111111111111111111111111111111111',
    creator: '7XqP111111111111111111111111111111111111111',
    campaignId: '101',
    title: 'AetherNet: Decentralized Ambient IoT Sensor Grid',
    description: 'Deploying sub-GHz community environmental nodes on Solana. Funding milestone 1 unlocks hardware tooling; backers vote on live testnet telemetry proofs before hardware manufacturing release.',
    goalSol: 25,
    raisedSol: 28.5,
    fundingDeadline: Math.floor(Date.now() / 1000) + 86400 * 12,
    termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'funding',
    currentMilestoneIndex: 0,
    protocolFeeSol: 0.285,
    distributableSol: 28.215,
    releasedSol: 0,
    reservedSol: 0,
    refundPoolSol: 0,
    bondSettled: false,
    backerCount: 14,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    websiteUrl: 'https://aethernet.network',
    milestones: [
      {
        index: 0,
        title: 'Initial PCB Prototype & Firmware Release',
        shareBps: 3000,
        workPeriodDays: 30,
        status: 'pending_evidence',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 8.4645,
        claimWithdrawn: false,
      },
      {
        index: 1,
        title: '50-Node Mesh Field Pilot Deployment',
        shareBps: 3500,
        workPeriodDays: 45,
        status: 'locked',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 9.87525,
        claimWithdrawn: false,
      },
      {
        index: 2,
        title: 'Production Manufacturing & Mainnet Indexer',
        shareBps: 3500,
        workPeriodDays: 60,
        status: 'locked',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 9.87525,
        claimWithdrawn: false,
      },
    ],
  },
  {
    address: 'BCrowZKRollup222222222222222222222222222222222',
    creator: '9ZkP222222222222222222222222222222222222222',
    campaignId: '102',
    title: 'ZeroIdentity: Anonymous Credential Prover for Web3',
    description: 'On-chain zero-knowledge recursive SNARK circuit prover for compliance without identity exposure. Goal met, Milestone 1 evidence submitted and open for community weighted vote.',
    goalSol: 40,
    raisedSol: 44.0,
    fundingDeadline: Math.floor(Date.now() / 1000) - 86400 * 2,
    termsHash: 'a7b1c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c921',
    status: 'success',
    currentMilestoneIndex: 0,
    protocolFeeSol: 0.44,
    distributableSol: 43.56,
    releasedSol: 0,
    reservedSol: 43.56,
    refundPoolSol: 0,
    bondSettled: false,
    backerCount: 22,
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80',
    websiteUrl: 'https://zeroidentity.sh',
    milestones: [
      {
        index: 0,
        title: 'Circom Circuits & Cryptographic Audit',
        shareBps: 4000,
        workPeriodDays: 20,
        status: 'voting',
        evidenceHash: 'arweave://x8Rk29A_ZK_PROOF_AUDIT_REPORT_CANONICAL_HASH',
        evidenceUri: 'https://arweave.net/x8Rk29A_ZK_PROOF_AUDIT_REPORT',
        round: 1,
        voteStart: Math.floor(Date.now() / 1000) - 86400 * 3,
        yesWeightSol: 26.5,
        noWeightSol: 2.0,
        amountSol: 17.424,
        claimWithdrawn: false,
      },
      {
        index: 1,
        title: 'Solana Verifier BPF Program & SDK',
        shareBps: 3000,
        workPeriodDays: 35,
        status: 'locked',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 13.068,
        claimWithdrawn: false,
      },
      {
        index: 2,
        title: 'Multi-party Computation Setup & Mainnet Ceremony',
        shareBps: 3000,
        workPeriodDays: 45,
        status: 'locked',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 13.068,
        claimWithdrawn: false,
      },
    ],
  },
  {
    address: 'BCrowAIMarket333333333333333333333333333333333',
    creator: '4AiP333333333333333333333333333333333333333',
    campaignId: '103',
    title: 'CognitiveSwarm: Autonomous Agent Negotiation Protocol',
    description: 'Protocol enabling micro-settlement for agentic LLM pairs using state channels on Solana. Milestone 1 released, team currently working on Milestone 2 integration.',
    goalSol: 30,
    raisedSol: 32.0,
    fundingDeadline: Math.floor(Date.now() / 1000) - 86400 * 40,
    termsHash: 'c9f2c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852e118',
    status: 'success',
    currentMilestoneIndex: 1,
    protocolFeeSol: 0.32,
    distributableSol: 31.68,
    releasedSol: 12.672,
    reservedSol: 19.008,
    refundPoolSol: 0,
    bondSettled: false,
    backerCount: 18,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    websiteUrl: 'https://cognitiveswarm.ai',
    milestones: [
      {
        index: 0,
        title: 'Core State Channel Program in Rust',
        shareBps: 4000,
        workPeriodDays: 30,
        status: 'approved',
        evidenceHash: 'arweave://mN5v11_RUST_CORE_STATE_CHANNELS_VERIFIED',
        evidenceUri: 'https://arweave.net/mN5v11_RUST_CORE_STATE_CHANNELS',
        round: 1,
        yesWeightSol: 22.0,
        noWeightSol: 1.5,
        amountSol: 12.672,
        claimWithdrawn: true,
      },
      {
        index: 1,
        title: 'Agent SDK & OpenAI Function Calling Binding',
        shareBps: 3000,
        workPeriodDays: 30,
        status: 'pending_evidence',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 9.504,
        claimWithdrawn: false,
      },
      {
        index: 2,
        title: 'Live Agent Arena & Public Telemetry Benchmarks',
        shareBps: 3000,
        workPeriodDays: 45,
        status: 'locked',
        round: 1,
        yesWeightSol: 0,
        noWeightSol: 0,
        amountSol: 9.504,
        claimWithdrawn: false,
      },
    ],
  },
];

export class MockTransactionStrategy implements TransactionStrategy {
  readonly modeName = 'mock' as const;

  private loadCampaigns(): CampaignModel[] {
    if (typeof window === 'undefined') return INITIAL_MOCK_CAMPAIGNS;
    const raw = localStorage.getItem(MOCK_STORAGE_KEYS.CAMPAIGNS);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEYS.CAMPAIGNS, JSON.stringify(INITIAL_MOCK_CAMPAIGNS));
      return INITIAL_MOCK_CAMPAIGNS;
    }
    try {
      return JSON.parse(raw) as CampaignModel[];
    } catch {
      return INITIAL_MOCK_CAMPAIGNS;
    }
  }

  private saveCampaigns(campaigns: CampaignModel[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOCK_STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
    }
  }

  private loadPledges(): PledgeModel[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(MOCK_STORAGE_KEYS.PLEDGES);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PledgeModel[];
    } catch {
      return [];
    }
  }

  private savePledges(pledges: PledgeModel[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOCK_STORAGE_KEYS.PLEDGES, JSON.stringify(pledges));
    }
  }

  async getCampaign(campaignAddress: string): Promise<CampaignModel | null> {
    const list = this.loadCampaigns();
    return list.find(c => c.address === campaignAddress) ?? null;
  }

  async listCampaigns(): Promise<CampaignModel[]> {
    return this.loadCampaigns();
  }

  async getUserPledges(backerWallet: string): Promise<PledgeModel[]> {
    const list = this.loadPledges();
    return list.filter(p => p.backerWallet === backerWallet);
  }

  async createCampaign(params: CreateCampaignParams, creatorWallet: string): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const newId = String(1000 + campaigns.length + 1);
    const newAddress = `BCrowMock${Math.random().toString(36).substring(2, 10).toUpperCase()}11111111111111111111`;

    const feeSol = (params.goalSol * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
    const distributableSol = params.goalSol - feeSol;

    const milestones: MilestoneModel[] = params.milestones.map((m, idx) => ({
      index: idx,
      title: m.title,
      shareBps: m.shareBps,
      workPeriodDays: m.workPeriodDays,
      status: idx === 0 ? 'pending_evidence' : 'locked',
      round: 1,
      yesWeightSol: 0,
      noWeightSol: 0,
      amountSol: (distributableSol * m.shareBps) / BPS_DENOMINATOR,
      claimWithdrawn: false,
    }));

    const newCampaign: CampaignModel = {
      address: newAddress,
      creator: creatorWallet,
      campaignId: newId,
      title: params.title,
      description: params.description,
      goalSol: params.goalSol,
      raisedSol: 0,
      fundingDeadline: Math.floor(Date.now() / 1000) + params.durationDays * 86400,
      termsHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      status: 'funding',
      currentMilestoneIndex: 0,
      protocolFeeSol: feeSol,
      distributableSol: distributableSol,
      releasedSol: 0,
      reservedSol: 0,
      refundPoolSol: 0,
      bondSettled: false,
      backerCount: 0,
      imageUrl: params.imageUrl,
      websiteUrl: params.websiteUrl,
      milestones,
    };

    campaigns.unshift(newCampaign);
    this.saveCampaigns(campaigns);

    return {
      signature: `mock_tx_create_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${newAddress}?cluster=devnet`,
      success: true,
      message: 'Campaign created successfully in Mock Mode',
    };
  }

  async pledge(campaignAddress: string, amountSol: number, backerWallet: string): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    campaign.raisedSol += amountSol;
    campaign.backerCount += 1;

    const pledges = this.loadPledges();
    const existing = pledges.find(p => p.campaignAddress === campaignAddress && p.backerWallet === backerWallet);
    if (existing) {
      existing.amountSol += amountSol;
      existing.cancelled = false;
    } else {
      pledges.push({
        campaignAddress,
        backerWallet,
        amountSol,
        cancelled: false,
        refundClaimed: false,
        terminationRefundClaimed: false,
        timestamp: Date.now(),
      });
    }

    if (campaign.raisedSol >= campaign.goalSol) {
      campaign.status = 'success';
      const fee = (campaign.raisedSol * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
      campaign.protocolFeeSol = fee;
      campaign.distributableSol = campaign.raisedSol - fee;
      campaign.reservedSol = campaign.distributableSol;
      for (const m of campaign.milestones) {
        m.amountSol = (campaign.distributableSol * m.shareBps) / BPS_DENOMINATOR;
      }
    }

    this.saveCampaigns(campaigns);
    this.savePledges(pledges);

    return {
      signature: `mock_tx_pledge_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: `Pledged ${amountSol} SOL successfully in Mock Mode`,
    };
  }

  async cancelPledge(campaignAddress: string, backerWallet: string): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    const pledges = this.loadPledges();
    const pledge = pledges.find(p => p.campaignAddress === campaignAddress && p.backerWallet === backerWallet);
    if (!pledge || pledge.cancelled) throw new Error('No active pledge to cancel');

    campaign.raisedSol = Math.max(0, campaign.raisedSol - pledge.amountSol);
    campaign.backerCount = Math.max(0, campaign.backerCount - 1);
    pledge.amountSol = 0;
    pledge.cancelled = true;

    this.saveCampaigns(campaigns);
    this.savePledges(pledges);

    return {
      signature: `mock_tx_cancel_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: 'Pledge cancelled and refunded in Mock Mode',
    };
  }

  async submitEvidence(
    campaignAddress: string,
    milestoneIndex: number,
    evidenceHash: string,
    evidenceUri: string
  ): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    const milestone = campaign.milestones.find(m => m.index === milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    milestone.evidenceHash = evidenceHash;
    milestone.evidenceUri = evidenceUri;
    milestone.status = 'voting';
    milestone.voteStart = Math.floor(Date.now() / 1000);

    this.saveCampaigns(campaigns);

    return {
      signature: `mock_tx_evidence_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: 'Proof submitted, 7-day milestone vote opened in Mock Mode',
    };
  }

  async voteMilestone(
    campaignAddress: string,
    milestoneIndex: number,
    approve: boolean,
    backerWallet: string
  ): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    const milestone = campaign.milestones.find(m => m.index === milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    const pledges = this.loadPledges();
    const pledge = pledges.find(p => p.campaignAddress === campaignAddress && p.backerWallet === backerWallet);
    const weight = pledge ? pledge.amountSol : 5.0;

    if (approve) {
      milestone.yesWeightSol += weight;
    } else {
      milestone.noWeightSol += weight;
    }

    this.saveCampaigns(campaigns);

    return {
      signature: `mock_tx_vote_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: `Vote (${approve ? 'Approve' : 'Reject'}) recorded with weight ${weight} SOL in Mock Mode`,
    };
  }

  async finalizeVote(campaignAddress: string, milestoneIndex: number, _callerWallet?: string): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    const milestone = campaign.milestones.find(m => m.index === milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    const { approved: isApproved } = evaluateAdaptiveQuorum(
      milestone.yesWeightSol,
      milestone.noWeightSol,
      campaign.raisedSol
    );
    if (isApproved) {
      milestone.status = 'approved';
    } else if (milestone.round === 1) {
      milestone.round = 2;
      milestone.status = 'revision';
    } else {
      milestone.status = 'rejected';
      campaign.status = 'terminated';
      campaign.refundPoolSol = campaign.distributableSol - campaign.releasedSol;
    }

    this.saveCampaigns(campaigns);

    return {
      signature: `mock_tx_finalize_vote_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: `Vote finalized: Milestone is now ${milestone.status}`,
    };
  }

  async releaseMilestone(campaignAddress: string, milestoneIndex: number): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    const milestone = campaign.milestones.find(m => m.index === milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    campaign.releasedSol += milestone.amountSol;
    campaign.reservedSol = Math.max(0, campaign.reservedSol - milestone.amountSol);

    const nextIndex = milestoneIndex + 1;
    if (nextIndex < campaign.milestones.length) {
      campaign.currentMilestoneIndex = nextIndex;
      campaign.milestones[nextIndex].status = 'pending_evidence';
    } else {
      campaign.status = 'completed';
    }

    this.saveCampaigns(campaigns);

    return {
      signature: `mock_tx_release_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: `Milestone ${milestoneIndex + 1} funds released to creator in Mock Mode`,
    };
  }

  async claimMilestoneFunds(campaignAddress: string, milestoneIndex: number): Promise<TransactionResult> {
    const campaigns = this.loadCampaigns();
    const campaign = campaigns.find(c => c.address === campaignAddress);
    if (!campaign) throw new Error('Campaign not found');

    const milestone = campaign.milestones.find(m => m.index === milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    milestone.claimWithdrawn = true;
    this.saveCampaigns(campaigns);

    return {
      signature: `mock_tx_claim_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: `Claim of ${milestone.amountSol.toFixed(4)} SOL disbursed in Mock Mode`,
    };
  }

  async claimRefund(campaignAddress: string, backerWallet: string): Promise<TransactionResult> {
    const pledges = this.loadPledges();
    const pledge = pledges.find(p => p.campaignAddress === campaignAddress && p.backerWallet === backerWallet);
    if (!pledge) throw new Error('Pledge record not found');

    pledge.refundClaimed = true;
    this.savePledges(pledges);

    return {
      signature: `mock_tx_refund_${Date.now()}`,
      explorerUrl: `https://explorer.solana.com/address/${campaignAddress}?cluster=devnet`,
      success: true,
      message: '100% refund reclaimed successfully in Mock Mode',
    };
  }

  async deleteCampaign(campaignAddress: string): Promise<TransactionResult> {
    let campaigns = this.loadCampaigns();
    campaigns = campaigns.filter((c) => c.address !== campaignAddress);
    this.saveCampaigns(campaigns);

    let pledges = this.loadPledges();
    pledges = pledges.filter((p) => p.campaignAddress !== campaignAddress);
    this.savePledges(pledges);

    return {
      signature: `mock_tx_del_${Date.now()}`,
      explorerUrl: '',
      success: true,
      message: 'Campaign deleted successfully from local storage',
    };
  }
}

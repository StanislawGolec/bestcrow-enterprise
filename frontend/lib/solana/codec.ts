import {
  Address,
  address,
  AccountRole,
  Instruction,
  getBase58Decoder,
} from '@solana/kit';
import {
  PROGRAM_ID,
  PROTOCOL_TREASURY,
  QUORUM_TURNOUT_BPS,
  BPS_DENOMINATOR,
} from '../constants';
import { CampaignStatus, MilestoneStatus } from '../types';

export const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111');

// ============================================================================
// 1. SHA-256 Synchronous Hasher & Anchor Discriminators
// ============================================================================

export function sha256Sync(data: string | Uint8Array): Uint8Array {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const l = bytes.length;
  const bitLen = l * 8;
  const padLen = l % 64 < 56 ? 56 - (l % 64) : 120 - (l % 64);
  const totalLen = l + padLen + 8;
  const msg = new Uint8Array(totalLen);
  msg.set(bytes);
  msg[l] = 0x80;
  const view = new DataView(msg.buffer);
  view.setBigUint64(totalLen - 8, BigInt(bitLen), false);

  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
}

export function anchorInstructionDiscriminator(name: string): Uint8Array {
  return sha256Sync(`global:${name}`).slice(0, 8);
}

export function anchorAccountDiscriminator(name: string): Uint8Array {
  return sha256Sync(`account:${name}`).slice(0, 8);
}

// Precomputed discriminators for standard Bestcrow instructions
export const IX_DISCRIMINATORS = {
  create_draft: anchorInstructionDiscriminator('create_draft'),
  add_tranche: anchorInstructionDiscriminator('add_tranche'),
  seal_terms: anchorInstructionDiscriminator('seal_terms'),
  pledge: anchorInstructionDiscriminator('pledge'),
  cancel_pledge: anchorInstructionDiscriminator('cancel_pledge'),
  finalize_funding: anchorInstructionDiscriminator('finalize_funding'),
  refund_for: anchorInstructionDiscriminator('refund_for'),
  submit_evidence: anchorInstructionDiscriminator('submit_evidence'),
  vote_milestone: anchorInstructionDiscriminator('vote_milestone'),
  finalize_vote: anchorInstructionDiscriminator('finalize_vote'),
  release_tranche: anchorInstructionDiscriminator('release_tranche'),
  withdraw_claim: anchorInstructionDiscriminator('withdraw_claim'),
  claim_bond: anchorInstructionDiscriminator('claim_bond'),
  close_backer: anchorInstructionDiscriminator('close_backer'),
} as const;

export const ACCOUNT_DISCRIMINATORS = {
  Campaign: anchorAccountDiscriminator('Campaign'),
  Tranche: anchorAccountDiscriminator('Tranche'),
  Backer: anchorAccountDiscriminator('Backer'),
  Vote: anchorAccountDiscriminator('Vote'),
} as const;

// ============================================================================
// 2. Binary Instruction Builders (@solana/kit Instruction)
// ============================================================================

export interface BuildCreateDraftParams {
  creator: Address;
  campaign: Address;
  campaignId: bigint;
  goalLamports: bigint;
  termsHash: Uint8Array;
  contentUri?: number;
  programId?: Address;
}

export function buildCreateDraftIx(params: BuildCreateDraftParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 8 + 8 + 32 + 4);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.create_draft, 0);
  view.setBigUint64(8, params.campaignId, true);
  view.setBigUint64(16, params.goalLamports, true);
  data.set(params.termsHash.slice(0, 32), 24);
  view.setUint32(56, params.contentUri ?? 0, true);

  return {
    programAddress: progId,
    accounts: [
      { address: params.creator, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

export interface BuildAddTrancheParams {
  creator: Address;
  campaign: Address;
  tranche: Address;
  index: number;
  shareBps: number;
  workPeriodSeconds: bigint;
  programId?: Address;
}

export function buildAddTrancheIx(params: BuildAddTrancheParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 1 + 2 + 8);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.add_tranche, 0);
  view.setUint8(8, params.index);
  view.setUint16(9, params.shareBps, true);
  view.setBigInt64(11, params.workPeriodSeconds, true);

  return {
    programAddress: progId,
    accounts: [
      { address: params.creator, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: params.tranche, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

export interface BuildSealTermsParams {
  creator: Address;
  campaign: Address;
  vault: Address;
  bond: Address;
  fundingSeconds: bigint;
  termsHash: Uint8Array;
  trancheAddresses: Address[];
  programId?: Address;
}

export function buildSealTermsIx(params: BuildSealTermsParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 8 + 32);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.seal_terms, 0);
  view.setBigInt64(8, params.fundingSeconds, true);
  data.set(params.termsHash.slice(0, 32), 16);

  const accounts = [
    { address: params.creator, role: AccountRole.WRITABLE_SIGNER },
    { address: params.campaign, role: AccountRole.WRITABLE },
    { address: params.vault, role: AccountRole.WRITABLE },
    { address: params.bond, role: AccountRole.WRITABLE },
    { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ...params.trancheAddresses.map((t) => ({ address: t, role: AccountRole.READONLY })),
  ];

  return {
    programAddress: progId,
    accounts,
    data,
  };
}

export interface BuildPledgeParams {
  backer: Address;
  campaign: Address;
  backerLedger: Address;
  vault: Address;
  amountLamports: bigint;
  programId?: Address;
}

export function buildPledgeIx(params: BuildPledgeParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 8);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.pledge, 0);
  view.setBigUint64(8, params.amountLamports, true);

  return {
    programAddress: progId,
    accounts: [
      { address: params.backer, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: params.backerLedger, role: AccountRole.WRITABLE },
      { address: params.vault, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

export interface BuildCancelPledgeParams {
  backer: Address;
  campaign: Address;
  backerLedger: Address;
  vault: Address;
  programId?: Address;
}

export function buildCancelPledgeIx(params: BuildCancelPledgeParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8);
  data.set(IX_DISCRIMINATORS.cancel_pledge, 0);

  return {
    programAddress: progId,
    accounts: [
      { address: params.backer, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: params.backerLedger, role: AccountRole.WRITABLE },
      { address: params.vault, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

export interface BuildFinalizeFundingParams {
  caller: Address;
  campaign: Address;
  treasury?: Address;
  vault: Address;
  systemProgram?: Address;
  trancheAddresses?: Address[];
  programId?: Address;
}

export function buildFinalizeFundingIx(params: BuildFinalizeFundingParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8);
  data.set(IX_DISCRIMINATORS.finalize_funding, 0);

  const treasuryAddr = params.treasury || address(PROTOCOL_TREASURY);
  const systemProgramAddr = params.systemProgram || SYSTEM_PROGRAM_ADDRESS;

  const accounts = [
    { address: params.caller, role: AccountRole.WRITABLE_SIGNER },
    { address: params.campaign, role: AccountRole.WRITABLE },
    { address: treasuryAddr, role: AccountRole.WRITABLE },
    { address: params.vault, role: AccountRole.WRITABLE },
    { address: systemProgramAddr, role: AccountRole.READONLY },
    ...(params.trancheAddresses ?? []).map((t) => ({ address: t, role: AccountRole.WRITABLE })),
  ];

  return {
    programAddress: progId,
    accounts,
    data,
  };
}

export interface BuildRefundForParams {
  caller: Address;
  campaign: Address;
  backerLedger: Address;
  backerWallet: Address;
  vault: Address;
  programId?: Address;
}

export function buildRefundForIx(params: BuildRefundForParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8);
  data.set(IX_DISCRIMINATORS.refund_for, 0);

  return {
    programAddress: progId,
    accounts: [
      { address: params.caller, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.READONLY },
      { address: params.backerLedger, role: AccountRole.WRITABLE },
      { address: params.backerWallet, role: AccountRole.WRITABLE },
      { address: params.vault, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

export interface BuildSubmitEvidenceParams {
  creator: Address;
  campaign: Address;
  tranche: Address;
  index: number;
  evidenceHash: Uint8Array;
  programId?: Address;
}

export function buildSubmitEvidenceIx(params: BuildSubmitEvidenceParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 1 + 32);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.submit_evidence, 0);
  view.setUint8(8, params.index);
  data.set(params.evidenceHash.slice(0, 32), 9);

  return {
    programAddress: progId,
    accounts: [
      { address: params.creator, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: params.tranche, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

export interface BuildVoteMilestoneParams {
  backer: Address;
  campaign: Address;
  tranche: Address;
  backerLedger: Address;
  voteRecord: Address;
  index: number;
  approve: boolean;
  programId?: Address;
}

export function buildVoteMilestoneIx(params: BuildVoteMilestoneParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 1 + 1);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.vote_milestone, 0);
  view.setUint8(8, params.index);
  view.setUint8(9, params.approve ? 1 : 0);

  return {
    programAddress: progId,
    accounts: [
      { address: params.backer, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.READONLY },
      { address: params.tranche, role: AccountRole.WRITABLE },
      { address: params.backerLedger, role: AccountRole.READONLY },
      { address: params.voteRecord, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

export interface BuildFinalizeVoteParams {
  caller: Address;
  campaign: Address;
  tranche: Address;
  index: number;
  programId?: Address;
}

export function buildFinalizeVoteIx(params: BuildFinalizeVoteParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 1);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.finalize_vote, 0);
  view.setUint8(8, params.index);

  return {
    programAddress: progId,
    accounts: [
      { address: params.caller, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: params.tranche, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

export interface BuildReleaseTrancheParams {
  caller: Address;
  campaign: Address;
  tranche: Address;
  index: number;
  programId?: Address;
}

export function buildReleaseTrancheIx(params: BuildReleaseTrancheParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 1);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.release_tranche, 0);
  view.setUint8(8, params.index);

  return {
    programAddress: progId,
    accounts: [
      { address: params.caller, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.WRITABLE },
      { address: params.tranche, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

export interface BuildWithdrawClaimParams {
  creator: Address;
  campaign: Address;
  tranche: Address;
  vault: Address;
  index: number;
  programId?: Address;
}

export function buildWithdrawClaimIx(params: BuildWithdrawClaimParams): Instruction {
  const progId = params.programId || address(PROGRAM_ID);
  const data = new Uint8Array(8 + 1);
  const view = new DataView(data.buffer);
  data.set(IX_DISCRIMINATORS.withdraw_claim, 0);
  view.setUint8(8, params.index);

  return {
    programAddress: progId,
    accounts: [
      { address: params.creator, role: AccountRole.WRITABLE_SIGNER },
      { address: params.campaign, role: AccountRole.READONLY },
      { address: params.tranche, role: AccountRole.WRITABLE },
      { address: params.vault, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

// ============================================================================
// 3. Binary Borsh Account Decoders
// ============================================================================

const CAMPAIGN_STATE_MAP: Record<number, CampaignStatus> = {
  0: 'draft',
  1: 'funding',
  2: 'success',
  3: 'failed',
  4: 'completed',
  5: 'terminated',
};

const TRANCHE_STATUS_MAP: Record<number, MilestoneStatus> = {
  0: 'locked',
  1: 'pending_evidence',
  2: 'voting',
  3: 'revision',
  4: 'approved',
  5: 'rejected',
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface DecodedCampaignAccount {
  creator: Address;
  campaignId: bigint;
  goal: bigint;
  fundingDeadline: bigint;
  termsHash: Uint8Array;
  termsHashHex: string;
  contentUri: number;
  state: CampaignStatus;
  trancheCount: number;
  currentTranche: number;
  raised: bigint;
  fee: bigint;
  distributable: bigint;
  released: bigint;
  reserved: bigint;
  refundPool: bigint;
  bondForfeited: boolean;
  bondSettled: boolean;
  bump: number;
}

export function decodeCampaignAccount(data: Uint8Array): DecodedCampaignAccount {
  if (data.length < 154) {
    throw new Error(`Invalid Campaign account data length: expected >= 154, got ${data.length}`);
  }
  const b58 = getBase58Decoder();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const creatorBytes = data.subarray(8, 40);
  const creator = b58.decode(creatorBytes) as Address;

  const campaignId = view.getBigUint64(40, true);
  const goal = view.getBigUint64(48, true);
  const fundingDeadline = view.getBigInt64(56, true);
  const termsHash = data.slice(64, 96);
  const termsHashHex = bytesToHex(termsHash);
  const contentUri = view.getUint32(96, true);
  const rawState = view.getUint8(100);
  const state = CAMPAIGN_STATE_MAP[rawState] ?? 'draft';
  const trancheCount = view.getUint8(101);
  const currentTranche = view.getUint8(102);
  const raised = view.getBigUint64(103, true);
  const fee = view.getBigUint64(111, true);
  const distributable = view.getBigUint64(119, true);
  const released = view.getBigUint64(127, true);
  const reserved = view.getBigUint64(135, true);
  const refundPool = view.getBigUint64(143, true);
  const bondForfeited = view.getUint8(151) !== 0;
  const bondSettled = view.getUint8(152) !== 0;
  const bump = view.getUint8(153);

  return {
    creator,
    campaignId,
    goal,
    fundingDeadline,
    termsHash,
    termsHashHex,
    contentUri,
    state,
    trancheCount,
    currentTranche,
    raised,
    fee,
    distributable,
    released,
    reserved,
    refundPool,
    bondForfeited,
    bondSettled,
    bump,
  };
}

export interface DecodedTrancheAccount {
  campaign: Address;
  index: number;
  shareBps: number;
  workPeriod: bigint;
  status: MilestoneStatus;
  evidenceDeadline: bigint;
  evidenceHash: Uint8Array;
  evidenceHashHex: string;
  round: number;
  voteStart: bigint;
  yesWeight: bigint;
  noWeight: bigint;
  amount: bigint;
  claimWithdrawn: boolean;
  bump: number;
}

export function decodeTrancheAccount(data: Uint8Array): DecodedTrancheAccount {
  if (data.length < 127) {
    throw new Error(`Invalid Tranche account data length: expected >= 127, got ${data.length}`);
  }
  const b58 = getBase58Decoder();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const campaignBytes = data.subarray(8, 40);
  const campaign = b58.decode(campaignBytes) as Address;

  const index = view.getUint8(40);
  const shareBps = view.getUint16(41, true);
  const workPeriod = view.getBigInt64(43, true);
  const rawStatus = view.getUint8(51);
  const status = TRANCHE_STATUS_MAP[rawStatus] ?? 'locked';
  const evidenceDeadline = view.getBigInt64(52, true);
  const evidenceHash = data.slice(60, 92);
  const evidenceHashHex = bytesToHex(evidenceHash);
  const round = view.getUint8(92);
  const voteStart = view.getBigInt64(93, true);
  const yesWeight = view.getBigUint64(101, true);
  const noWeight = view.getBigUint64(109, true);
  const amount = view.getBigUint64(117, true);
  const claimWithdrawn = view.getUint8(125) !== 0;
  const bump = view.getUint8(126);

  return {
    campaign,
    index,
    shareBps,
    workPeriod,
    status,
    evidenceDeadline,
    evidenceHash,
    evidenceHashHex,
    round,
    voteStart,
    yesWeight,
    noWeight,
    amount,
    claimWithdrawn,
    bump,
  };
}

export interface DecodedBackerAccount {
  campaign: Address;
  backer: Address;
  amount: bigint;
  cancelled: boolean;
  refundClaimed: boolean;
  terminationRefundClaimed: boolean;
  bump: number;
}

export function decodeBackerAccount(data: Uint8Array): DecodedBackerAccount {
  if (data.length < 84) {
    throw new Error(`Invalid Backer account data length: expected >= 84, got ${data.length}`);
  }
  const b58 = getBase58Decoder();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const campaignBytes = data.subarray(8, 40);
  const campaign = b58.decode(campaignBytes) as Address;

  const backerBytes = data.subarray(40, 72);
  const backer = b58.decode(backerBytes) as Address;

  const amount = view.getBigUint64(72, true);
  const cancelled = view.getUint8(80) !== 0;
  const refundClaimed = view.getUint8(81) !== 0;
  const terminationRefundClaimed = view.getUint8(82) !== 0;
  const bump = view.getUint8(83);

  return {
    campaign,
    backer,
    amount,
    cancelled,
    refundClaimed,
    terminationRefundClaimed,
    bump,
  };
}

// ============================================================================
// 4. Adaptive Quorum Evaluation Helper
// ============================================================================

export function evaluateAdaptiveQuorum(
  yesSol: number,
  noSol: number,
  raisedSol: number
): { approved: boolean; turnoutPercent: number; activeYesPercent: number } {
  const totalVotes = yesSol + noSol;
  const turnoutPercent = raisedSol > 0 ? (totalVotes / raisedSol) * 100 : 0;
  const activeYesPercent = totalVotes > 0 ? (yesSol / totalVotes) * 100 : 0;

  // Adaptive Quorum Rule:
  // 1. Quorum: Turnout of raisedSol >= 25% (QUORUM_TURNOUT_BPS / BPS_DENOMINATOR)
  // 2. Simple Majority: yesVotesSol > noVotesSol
  const minRequiredTurnout = (raisedSol * QUORUM_TURNOUT_BPS) / BPS_DENOMINATOR;
  const quorumMet = raisedSol > 0 && totalVotes >= minRequiredTurnout;
  const majorityYes = yesSol > noSol;
  const approved = quorumMet && majorityYes;

  return {
    approved,
    turnoutPercent,
    activeYesPercent,
  };
}

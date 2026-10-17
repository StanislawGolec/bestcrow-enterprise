export type StreamEventType =
  | 'pledge'
  | 'evidence_submitted'
  | 'vote_cast'
  | 'milestone_finalized'
  | 'milestone_released'
  | 'refund_claimed'
  | 'campaign_state_changed'
  | 'heartbeat';

export interface CampaignStreamEvent {
  id: string;
  type: StreamEventType;
  campaignAddress: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ProcessedTransaction {
  signature: string;
  slot: number;
  blockTime: number | null;
  confirmationStatus: 'processed' | 'confirmed' | 'finalized';
  processedAt: number;
}

import { randomUUID } from 'node:crypto';
import { SolanaService } from './solana_service.js';
import { CampaignRepository } from '../repositories/campaign_repository.js';
import { BackerRepository } from '../repositories/backer_repository.js';
import { EventRepository } from '../repositories/event_repository.js';
import { ProcessedTransactionRepository } from '../repositories/transaction_repository.js';
import { EventBroadcaster } from './event_broadcaster.js';
import { CampaignStreamEvent, StreamEventType } from '../domain/events.js';

export interface IndexerOptions {
  pollIntervalMs?: number;
  scanLimit?: number;
  confirmationLevel?: 'processed' | 'confirmed' | 'finalized';
}

export class SolanaIndexer {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly pollIntervalMs: number;
  private readonly scanLimit: number;
  private readonly confirmationLevel: 'processed' | 'confirmed' | 'finalized';

  constructor(
    private readonly solanaService: SolanaService,
    private readonly campaignRepository: CampaignRepository,
    private readonly backerRepository: BackerRepository,
    private readonly eventRepository: EventRepository,
    private readonly transactionRepository: ProcessedTransactionRepository,
    private readonly eventBroadcaster: EventBroadcaster,
    options: IndexerOptions = {}
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 15000;
    this.scanLimit = options.scanLimit ?? 50;
    this.confirmationLevel = options.confirmationLevel ?? 'confirmed';
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.syncCycle();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async syncCycle(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    try {
      const programId = this.solanaService.getProgramId();
      const signatures = await this.solanaService.getSignaturesForAddress(programId, this.scanLimit);

      for (const sigInfo of signatures) {
        const signature = String(sigInfo.signature);
        if (this.transactionRepository.isProcessed(signature)) {
          continue;
        }

        const slot = Number(sigInfo.slot);
        const blockTime = sigInfo.blockTime ? Number(sigInfo.blockTime) : null;
        const memo = sigInfo.memo ? String(sigInfo.memo) : null;
        const err = sigInfo.err;

        // Skip failed transactions
        if (err !== null && err !== undefined) {
          this.transactionRepository.markProcessed({
            signature,
            slot,
            blockTime,
            confirmationStatus: this.confirmationLevel,
            processedAt: Math.floor(Date.now() / 1000),
          });
          continue;
        }

        const parsed = this.parseTransactionLogs(memo, signature);
        if (parsed) {
          this.applyParsedEvent(parsed, signature, slot, blockTime);
        }

        this.transactionRepository.markProcessed({
          signature,
          slot,
          blockTime,
          confirmationStatus: this.confirmationLevel,
          processedAt: Math.floor(Date.now() / 1000),
        });

        processedCount += 1;
      }
    } catch {
      // Retrying next interval on RPC connectivity failure
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  ingestDirectEvent(event: CampaignStreamEvent, signature?: string): void {
    const sig = signature || `sim_${randomUUID().replace(/-/g, '')}`;
    const nowSec = Math.floor(event.timestamp / 1000);

    // Save to event log
    this.eventRepository.save({
      signature: sig,
      slot: 0,
      blockTime: nowSec,
      eventName: event.type,
      campaignAddress: event.campaignAddress,
      backerWallet: (event.data.backerWallet as string) || null,
      amountLamports: (event.data.amountLamports as string) || null,
      payload: JSON.stringify(event.data),
      createdAt: nowSec,
    });

    // Mark transaction as processed
    this.transactionRepository.markProcessed({
      signature: sig,
      slot: 0,
      blockTime: nowSec,
      confirmationStatus: 'confirmed',
      processedAt: nowSec,
    });

    // Broadcast live to connected SSE streams
    this.eventBroadcaster.publish(event);
  }

  private parseTransactionLogs(memo: string | null, signature: string): {
    type: StreamEventType;
    campaignAddress: string;
    data: Record<string, unknown>;
  } | null {
    if (!memo) {
      return null;
    }

    try {
      if (memo.startsWith('{') && memo.endsWith('}')) {
        const payload = JSON.parse(memo) as Record<string, unknown>;
        if (payload.type && payload.campaignAddress) {
          return {
            type: payload.type as StreamEventType,
            campaignAddress: String(payload.campaignAddress),
            data: payload,
          };
        }
      }
    } catch {
      // Fallback for non-JSON memos
    }

    // Keyword heuristics for instruction signatures
    if (memo.includes('PledgeFunds')) {
      return {
        type: 'pledge',
        campaignAddress: '',
        data: { signature, memo },
      };
    }

    return null;
  }

  private applyParsedEvent(
    parsed: { type: StreamEventType; campaignAddress: string; data: Record<string, unknown> },
    signature: string,
    slot: number,
    blockTime: number | null
  ): void {
    const timestamp = blockTime ? blockTime * 1000 : Date.now();
    const event: CampaignStreamEvent = {
      id: signature,
      type: parsed.type,
      campaignAddress: parsed.campaignAddress,
      timestamp,
      data: parsed.data,
    };

    // Save event log
    this.eventRepository.save({
      signature,
      slot,
      blockTime,
      eventName: parsed.type,
      campaignAddress: parsed.campaignAddress || null,
      backerWallet: (parsed.data.backerWallet as string) || null,
      amountLamports: (parsed.data.amountLamports as string) || null,
      payload: JSON.stringify(parsed.data),
      createdAt: Math.floor(timestamp / 1000),
    });

    // Broadcast to live stream
    this.eventBroadcaster.publish(event);
  }
}

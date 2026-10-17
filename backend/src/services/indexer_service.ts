import { SolanaService } from './solana_service.js';
import { CampaignRepository } from '../repositories/campaign_repository.js';
import { EventRepository } from '../repositories/event_repository.js';

export class IndexerService {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly solanaService: SolanaService,
    private readonly campaignRepository: CampaignRepository,
    private readonly eventRepository: EventRepository,
    private readonly pollIntervalMs: number = 15000,
    private readonly scanLimit: number = 50
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.syncOnce();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async syncOnce(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    try {
      const programId = this.solanaService.getProgramId();
      const signatures = await this.solanaService.getSignaturesForAddress(programId, this.scanLimit);

      for (const sigInfo of signatures) {
        const signature = sigInfo.signature;
        const slot = Number(sigInfo.slot);
        const blockTime = sigInfo.blockTime ? Number(sigInfo.blockTime) : null;

        const inserted = this.eventRepository.save({
          signature,
          slot,
          blockTime,
          eventName: 'ProgramTransaction',
          campaignAddress: null,
          backerWallet: null,
          amountLamports: null,
          payload: JSON.stringify({ memo: sigInfo.memo, err: sigInfo.err }),
          createdAt: Math.floor(Date.now() / 1000),
        });

        if (inserted) {
          processedCount += 1;
        }
      }
    } catch {
      // Background indexer ignores transient network errors and retries next cycle
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}

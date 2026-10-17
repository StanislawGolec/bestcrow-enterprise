import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { EventBroadcaster } from '../services/event_broadcaster.js';
import { SolanaIndexer } from '../services/solana_indexer.js';
import { CampaignStreamEvent, StreamEventType } from '../domain/events.js';

const BroadcastSchema = z.object({
  type: z.enum([
    'pledge',
    'evidence_submitted',
    'vote_cast',
    'milestone_finalized',
    'milestone_released',
    'refund_claimed',
    'campaign_state_changed',
  ]),
  data: z.record(z.unknown()).default({}),
});

export class StreamController {
  constructor(
    private readonly eventBroadcaster: EventBroadcaster,
    private readonly solanaIndexer?: SolanaIndexer
  ) {}

  streamCampaignEvents = (req: Request, res: Response): void => {
    const campaignAddress = String(req.params.address || '');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const initialPayload = JSON.stringify({
      status: 'connected',
      campaignAddress,
      timestamp: Date.now(),
    });
    res.write(`event: connected\ndata: ${initialPayload}\n\n`);

    const subscription = this.eventBroadcaster.subscribe(campaignAddress, (event: CampaignStreamEvent) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    // 15-second keep-alive heartbeat ping
    const heartbeatTimer = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      subscription.unsubscribe();
    });
  };

  streamAllEvents = (req: Request, res: Response): void => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const initialPayload = JSON.stringify({
      status: 'connected',
      scope: 'global',
      timestamp: Date.now(),
    });
    res.write(`event: connected\ndata: ${initialPayload}\n\n`);

    const subscription = this.eventBroadcaster.subscribeAll((event: CampaignStreamEvent) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeatTimer = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      subscription.unsubscribe();
    });
  };

  broadcastEvent = (req: Request, res: Response): void => {
    const campaignAddress = String(req.params.address || '');
    const validated = BroadcastSchema.parse(req.body);

    const event: CampaignStreamEvent = {
      id: `evt_${randomUUID().replace(/-/g, '')}`,
      type: validated.type as StreamEventType,
      campaignAddress,
      timestamp: Date.now(),
      data: validated.data,
    };

    if (this.solanaIndexer) {
      this.solanaIndexer.ingestDirectEvent(event);
    } else {
      this.eventBroadcaster.publish(event);
    }

    res.status(202).json({
      success: true,
      eventId: event.id,
      timestamp: event.timestamp,
    });
  };
}

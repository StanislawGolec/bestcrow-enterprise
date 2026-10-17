import { EventEmitter } from 'node:events';
import { CampaignStreamEvent } from '../domain/events.js';

export interface BroadcasterSubscription {
  unsubscribe: () => void;
}

export class EventBroadcaster {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  publish(event: CampaignStreamEvent): void {
    this.emitter.emit('event:all', event);
    if (event.campaignAddress) {
      this.emitter.emit(`event:campaign:${event.campaignAddress}`, event);
    }
  }

  subscribe(campaignAddress: string, listener: (event: CampaignStreamEvent) => void): BroadcasterSubscription {
    const channel = `event:campaign:${campaignAddress}`;
    this.emitter.on(channel, listener);

    return {
      unsubscribe: () => {
        this.emitter.off(channel, listener);
      },
    };
  }

  subscribeAll(listener: (event: CampaignStreamEvent) => void): BroadcasterSubscription {
    const channel = 'event:all';
    this.emitter.on(channel, listener);

    return {
      unsubscribe: () => {
        this.emitter.off(channel, listener);
      },
    };
  }

  getSubscriberCount(campaignAddress?: string): number {
    if (campaignAddress) {
      return this.emitter.listenerCount(`event:campaign:${campaignAddress}`);
    }
    return this.emitter.listenerCount('event:all');
  }
}

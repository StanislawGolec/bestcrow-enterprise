'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CampaignStreamEvent {
  id: string;
  type: string;
  campaignAddress: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface UseCampaignStreamOptions {
  enabled?: boolean;
  onEvent?: (event: CampaignStreamEvent) => void;
  apiBaseUrl?: string;
}

export interface UseCampaignStreamResult {
  isConnected: boolean;
  lastEvent: CampaignStreamEvent | null;
  errorCount: number;
  reconnect: () => void;
}

export function useCampaignStream(
  campaignAddress: string,
  options: UseCampaignStreamOptions = {}
): UseCampaignStreamResult {
  const {
    enabled = true,
    onEvent,
    apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<CampaignStreamEvent | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    cleanup();
    if (!enabled || !campaignAddress || typeof window === 'undefined') {
      return;
    }

    try {
      const url = `${apiBaseUrl.replace(/\/$/, '')}/api/campaigns/${encodeURIComponent(campaignAddress)}/stream`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setErrorCount(0);
      };

      es.addEventListener('connected', () => {
        setIsConnected(true);
      });

      const handleIncomingMessage = (type: string, e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as CampaignStreamEvent;
          setLastEvent(parsed);
          if (onEventRef.current) {
            onEventRef.current(parsed);
          }
        } catch {
          // Ignore invalid JSON frames
        }
      };

      const eventTypes = [
        'message',
        'pledge',
        'evidence_submitted',
        'vote_cast',
        'milestone_finalized',
        'milestone_released',
        'refund_claimed',
        'campaign_state_changed',
      ];

      for (const evType of eventTypes) {
        es.addEventListener(evType, (e: MessageEvent) => handleIncomingMessage(evType, e));
      }

      es.onerror = () => {
        setIsConnected(false);
        setErrorCount((prev) => prev + 1);
        cleanup();

        // Exponential backoff reconnect: 2s -> 4s -> max 15s
        const delay = Math.min(2000 * Math.pow(1.5, errorCount), 15000);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setIsConnected(false);
    }
  }, [campaignAddress, enabled, apiBaseUrl, cleanup, errorCount]);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
  }, [campaignAddress, enabled, apiBaseUrl]);

  return {
    isConnected,
    lastEvent,
    errorCount,
    reconnect: connect,
  };
}

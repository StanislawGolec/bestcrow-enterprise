import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SqliteProcessedTransactionRepository } from '../src/repositories/transaction_repository.js';
import { EventBroadcaster } from '../src/services/event_broadcaster.js';
import { SolanaIndexer } from '../src/services/solana_indexer.js';
import { SqliteCampaignRepository } from '../src/repositories/campaign_repository.js';
import { SqliteBackerRepository } from '../src/repositories/backer_repository.js';
import { SqliteEventRepository } from '../src/repositories/event_repository.js';
import { SolanaService } from '../src/services/solana_service.js';
import { PrimaryFallbackRpcStrategy } from '../src/strategies/rpc_strategy.js';
import { ExponentialBackoffRetry } from '../src/strategies/exponential_backoff_retry.js';
import { CampaignStreamEvent } from '../src/domain/events.js';

test('SqliteProcessedTransactionRepository', async (t) => {
  const db = new DatabaseSync(':memory:');
  const repo = new SqliteProcessedTransactionRepository(db);

  await t.test('should record transaction and prevent duplicate processing', () => {
    const inserted1 = repo.markProcessed({
      signature: 'sig_alpha_123',
      slot: 1001,
      blockTime: 1700000000,
      confirmationStatus: 'confirmed',
      processedAt: 1700000001,
    });
    assert.strictEqual(inserted1, true, 'First insert must succeed');
    assert.strictEqual(repo.isProcessed('sig_alpha_123'), true);

    const inserted2 = repo.markProcessed({
      signature: 'sig_alpha_123',
      slot: 1001,
      blockTime: 1700000000,
      confirmationStatus: 'finalized',
      processedAt: 1700000010,
    });
    assert.strictEqual(inserted2, false, 'Duplicate signature must be ignored');
    assert.strictEqual(repo.count(), 1);

    const found = repo.findBySignature('sig_alpha_123');
    assert.ok(found);
    assert.strictEqual(found.signature, 'sig_alpha_123');
    assert.strictEqual(found.slot, 1001);
  });
});

test('EventBroadcaster pub-sub functionality', async (t) => {
  const broadcaster = new EventBroadcaster();

  await t.test('should deliver events to campaign-specific and global listeners', () => {
    const campaignEvents: CampaignStreamEvent[] = [];
    const globalEvents: CampaignStreamEvent[] = [];

    const subCampaign = broadcaster.subscribe('camp_test_1', (ev) => {
      campaignEvents.push(ev);
    });

    const subGlobal = broadcaster.subscribeAll((ev) => {
      globalEvents.push(ev);
    });

    const testEvent: CampaignStreamEvent = {
      id: 'evt_1',
      type: 'pledge',
      campaignAddress: 'camp_test_1',
      timestamp: Date.now(),
      data: { backer: 'BackerWallet111', amountSol: 5 },
    };

    broadcaster.publish(testEvent);

    assert.strictEqual(campaignEvents.length, 1);
    assert.strictEqual(campaignEvents[0].type, 'pledge');
    assert.strictEqual(globalEvents.length, 1);
    assert.strictEqual(globalEvents[0].id, 'evt_1');

    // Unsubscribe test
    subCampaign.unsubscribe();
    broadcaster.publish({
      ...testEvent,
      id: 'evt_2',
    });

    assert.strictEqual(campaignEvents.length, 1, 'Unsubscribed listener must not receive further events');
    assert.strictEqual(globalEvents.length, 2, 'Global listener continues receiving events');

    subGlobal.unsubscribe();
  });
});

test('SolanaIndexer live event ingestion', async (t) => {
  const db = new DatabaseSync(':memory:');
  const campaignRepo = new SqliteCampaignRepository(db);
  const backerRepo = new SqliteBackerRepository(db);
  const eventRepo = new SqliteEventRepository(db);
  const txRepo = new SqliteProcessedTransactionRepository(db);
  const broadcaster = new EventBroadcaster();

  const rpcStrategy = new PrimaryFallbackRpcStrategy('http://localhost:8899', 'http://localhost:8899');
  const retryPolicy = new ExponentialBackoffRetry({ maxAttempts: 1, initialDelayMs: 10 });
  const solanaService = new SolanaService(rpcStrategy, retryPolicy, '11111111111111111111111111111111');

  const indexer = new SolanaIndexer(
    solanaService,
    campaignRepo,
    backerRepo,
    eventRepo,
    txRepo,
    broadcaster
  );

  await t.test('should ingest direct event and notify active subscriber', () => {
    const receivedEvents: CampaignStreamEvent[] = [];
    broadcaster.subscribe('camp_99', (ev) => {
      receivedEvents.push(ev);
    });

    indexer.ingestDirectEvent(
      {
        id: 'mock_tx_1',
        type: 'evidence_submitted',
        campaignAddress: 'camp_99',
        timestamp: Date.now(),
        data: { trancheIndex: 0, evidenceHash: '0xabc123' },
      },
      'tx_signature_mock_99'
    );

    assert.strictEqual(receivedEvents.length, 1);
    assert.strictEqual(receivedEvents[0].type, 'evidence_submitted');
    assert.strictEqual(txRepo.isProcessed('tx_signature_mock_99'), true);

    const loggedEvents = eventRepo.findByCampaign('camp_99', 10, 0);
    assert.strictEqual(loggedEvents.length, 1);
    assert.strictEqual(loggedEvents[0].eventName, 'evidence_submitted');
  });
});

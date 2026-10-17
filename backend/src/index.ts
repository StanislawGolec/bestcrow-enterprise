import { DatabaseSync } from 'node:sqlite';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { environment } from './config/environment.js';
import { SqliteCampaignRepository } from './repositories/campaign_repository.js';
import { SqliteBackerRepository } from './repositories/backer_repository.js';
import { SqliteEventRepository } from './repositories/event_repository.js';
import { PrimaryFallbackRpcStrategy } from './strategies/rpc_strategy.js';
import { ExponentialBackoffRetry } from './strategies/exponential_backoff_retry.js';
import { SolanaService } from './services/solana_service.js';
import { CampaignService } from './services/campaign_service.js';
import { IndexerService } from './services/indexer_service.js';
import { CampaignController } from './controllers/campaign_controller.js';
import { SystemController } from './controllers/system_controller.js';
import { createApplication } from './app.js';

if (environment.DB_PATH !== ':memory:') {
  mkdirSync(dirname(environment.DB_PATH), { recursive: true });
}

const database = new DatabaseSync(environment.DB_PATH);
database.exec('PRAGMA journal_mode = WAL;');
database.exec('PRAGMA foreign_keys = ON;');

const campaignRepository = new SqliteCampaignRepository(database);
const backerRepository = new SqliteBackerRepository(database);
const eventRepository = new SqliteEventRepository(database);

const rpcStrategy = new PrimaryFallbackRpcStrategy(
  environment.SOLANA_RPC_PRIMARY_URL,
  environment.SOLANA_RPC_FALLBACK_URL
);

const retryPolicy = new ExponentialBackoffRetry({
  maxAttempts: environment.RPC_RETRY_MAX_ATTEMPTS,
  initialDelayMs: environment.RPC_RETRY_INITIAL_DELAY_MS,
});

const solanaService = new SolanaService(rpcStrategy, retryPolicy, environment.BESTCROW_PROGRAM_ID);
const campaignService = new CampaignService(campaignRepository, backerRepository, eventRepository);
const indexerService = new IndexerService(
  solanaService,
  campaignRepository,
  eventRepository,
  environment.INDEXER_POLL_INTERVAL_MS,
  environment.SIGNATURE_SCAN_LIMIT
);

const campaignController = new CampaignController(campaignService);
const systemController = new SystemController(rpcStrategy, solanaService);

const app = createApplication(campaignController, systemController, environment.CORS_ORIGIN);

const server = app.listen(environment.PORT, () => {
  console.log(`[Bestcrow] Server listening on port ${environment.PORT}`);
  console.log(`[Bestcrow] Cluster: ${environment.CLUSTER}, Program ID: ${environment.BESTCROW_PROGRAM_ID}`);
  console.log(`[Bestcrow] SQLite Database: ${environment.DB_PATH}`);
});

if (environment.INDEXER_ENABLED) {
  indexerService.start();
  console.log('[Bestcrow] Blockchain indexer started');
}

let isShuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Bestcrow] Received ${signal}, shutting down gracefully...`);

    indexerService.stop();
    server.close(() => {
      database.close();
      console.log('[Bestcrow] Server stopped successfully');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Bestcrow] Forced shutdown due to timeout');
      process.exit(1);
    }, 5000).unref();
  });
}

import { z } from 'zod';

const EnvironmentSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('*'),
  SOLANA_RPC_PRIMARY_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_RPC_FALLBACK_URL: z.string().url().default('https://api.testnet.solana.com'),
  BESTCROW_PROGRAM_ID: z.string().default('3jGgPRa4gH25wfL49E3TAtpix5ePUZKWrQLT83eNZBVr'),
  CLUSTER: z.enum(['devnet', 'testnet', 'mainnet-beta', 'localnet']).default('devnet'),
  DB_PATH: z.string().default('./data/bestcrow.db'),
  INDEXER_ENABLED: z.string().transform(v => v === 'true' || v === '1').default('true'),
  INDEXER_POLL_INTERVAL_MS: z.coerce.number().default(15000),
  SIGNATURE_SCAN_LIMIT: z.coerce.number().default(200),
  RPC_RETRY_MAX_ATTEMPTS: z.coerce.number().default(3),
  RPC_RETRY_INITIAL_DELAY_MS: z.coerce.number().default(250),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export function loadEnvironment(overrides: Record<string, string | undefined> = {}): Environment {
  const merged = { ...process.env, ...overrides };
  return EnvironmentSchema.parse(merged);
}

export const environment: Environment = loadEnvironment();

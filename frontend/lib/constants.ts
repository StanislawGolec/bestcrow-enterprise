export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID || '3jGgPRa4gH25wfL49E3TAtpix5ePUZKWrQLT83eNZBVr';

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const BPS_DENOMINATOR = 10_000;
export const MAX_TRANCHE_BPS = 5_000;
export const PROTOCOL_FEE_BPS = 100;
export const CREATOR_BOND_SOL = 0.1;

export const VOTING_WINDOW_SECONDS = 7 * 86_400;
export const REVISION_WINDOW_SECONDS = 30 * 86_400;

export const MOCK_STORAGE_KEYS = {
  CAMPAIGNS: 'bestcrow_enterprise:mock_campaigns',
  PLEDGES: 'bestcrow_enterprise:mock_pledges',
  MODE: 'bestcrow_enterprise:operating_mode',
  ACTIVE_WALLET: 'bestcrow_enterprise:active_wallet',
} as const;

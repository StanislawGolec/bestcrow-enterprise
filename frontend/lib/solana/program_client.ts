import { createSolanaRpc, address } from '@solana/kit';
import { SOLANA_RPC_URL } from '../constants';

export class ProgramClient {
  private readonly rpc = createSolanaRpc(SOLANA_RPC_URL);

  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: bigint }> {
    const res = await this.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
    return {
      blockhash: res.value.blockhash,
      lastValidBlockHeight: res.value.lastValidBlockHeight,
    };
  }

  async getBalance(walletAddress: string): Promise<bigint> {
    const res = await this.rpc.getBalance(address(walletAddress)).send();
    return res.value;
  }
}

export const programClient = new ProgramClient();

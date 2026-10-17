import { createSolanaRpc, address } from '@solana/kit';
import { RpcStrategy } from '../strategies/rpc_strategy.js';
import { ExponentialBackoffRetry } from '../strategies/exponential_backoff_retry.js';
import { BlockchainRpcError } from '../domain/errors.js';

export class SolanaService {
  constructor(
    private readonly rpcStrategy: RpcStrategy,
    private readonly retryPolicy: ExponentialBackoffRetry,
    private readonly programId: string
  ) {}

  getProgramId(): string {
    return this.programId;
  }

  async getAccountInfo(addressString: string) {
    return this.executeWithRetry(async (rpc) => {
      const response = await rpc.getAccountInfo(address(addressString), { encoding: 'base64' }).send();
      return response.value;
    });
  }

  async getSignaturesForAddress(addressString: string, limit: number = 20) {
    return this.executeWithRetry(async (rpc) => {
      const response = await rpc.getSignaturesForAddress(address(addressString), { limit }).send();
      return response;
    });
  }

  async getSlot() {
    return this.executeWithRetry(async (rpc) => {
      return await rpc.getSlot().send();
    });
  }

  private async executeWithRetry<T>(operation: (rpc: ReturnType<typeof createSolanaRpc>) => Promise<T>): Promise<T> {
    const targetUrl = this.rpcStrategy.getActiveUrl();
    const rpc = createSolanaRpc(targetUrl);

    try {
      return await this.retryPolicy.execute(async () => {
        try {
          const result = await operation(rpc);
          this.rpcStrategy.reportSuccess(targetUrl);
          return result;
        } catch (error) {
          this.rpcStrategy.reportFailure(targetUrl, error);
          throw error;
        }
      });
    } catch (finalError) {
      throw new BlockchainRpcError(`Failed executing request against ${targetUrl}`, finalError);
    }
  }
}

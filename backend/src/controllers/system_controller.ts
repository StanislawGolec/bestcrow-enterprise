import { Request, Response } from 'express';
import { RpcStrategy } from '../strategies/rpc_strategy.js';
import { SolanaService } from '../services/solana_service.js';

export class SystemController {
  constructor(
    private readonly rpcStrategy: RpcStrategy,
    private readonly solanaService: SolanaService
  ) {}

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
      const slot = await this.solanaService.getSlot();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        solanaSlot: Number(slot),
        rpc: this.rpcStrategy.getStatus(),
      });
    } catch {
      res.status(200).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        rpc: this.rpcStrategy.getStatus(),
      });
    }
  };

  getStatus = (_req: Request, res: Response): void => {
    res.json({
      status: 'operational',
      uptimeSeconds: Math.floor(process.uptime()),
      programId: this.solanaService.getProgramId(),
      rpc: this.rpcStrategy.getStatus(),
    });
  };
}

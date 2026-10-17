import { Request, Response } from 'express';
import { MetricsService } from '../services/metrics_service.js';

export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  getMetrics = (_req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(this.metricsService.generateExpositionText());
  };
}

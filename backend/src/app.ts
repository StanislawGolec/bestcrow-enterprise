import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { DomainError } from './domain/errors.js';
import { CampaignController } from './controllers/campaign_controller.js';
import { SystemController } from './controllers/system_controller.js';
import { EvidenceController } from './controllers/evidence_controller.js';
import { StreamController } from './controllers/stream_controller.js';

export function createApplication(
  campaignController: CampaignController,
  systemController: SystemController,
  evidenceController?: EvidenceController,
  streamController?: StreamController,
  corsOrigin: string = '*'
): Express {
  const app = express();

  app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'] }));
  app.use(express.json());

  app.get('/api/health', systemController.getHealth);
  app.get('/api/system/status', systemController.getStatus);

  app.get('/api/campaigns', campaignController.listCampaigns);
  app.get('/api/campaigns/:address', campaignController.getCampaign);
  app.patch('/api/campaigns/:address/metadata', campaignController.updateMetadata);
  app.get('/api/campaigns/:address/backers', campaignController.getBackers);
  app.get('/api/campaigns/:address/events', campaignController.getEvents);
  app.get('/api/backers/:wallet/contributions', campaignController.getContributionsByWallet);

  if (evidenceController) {
    app.post('/api/evidence/upload', evidenceController.uploadEvidence);
    app.get('/api/evidence/:uriOrHash', evidenceController.getEvidence);
  }

  if (streamController) {
    app.get('/api/campaigns/:address/stream', streamController.streamCampaignEvents);
    app.get('/api/events/stream', streamController.streamAllEvents);
    app.post('/api/campaigns/:address/events/broadcast', streamController.broadcastEvent);
  }

  // Global Error Handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }

    if (err instanceof DomainError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
      return;
    }

    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({
      success: false,
      error: message,
    });
  });

  return app;
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CampaignService } from '../services/campaign_service.js';
import { CampaignState } from '../domain/models.js';

const MetadataUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});

export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  listCampaigns = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const status = req.query.status as CampaignState | undefined;
      const campaigns = this.campaignService.listCampaigns(status);
      res.json({ success: true, count: campaigns.length, data: campaigns });
    } catch (error) {
      next(error);
    }
  };

  getCampaign = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { address } = req.params;
      const campaign = this.campaignService.getCampaignByAddress(address);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  };

  updateMetadata = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { address } = req.params;
      const validatedData = MetadataUpdateSchema.parse(req.body);
      const updated = this.campaignService.updateCampaignMetadata(address, validatedData);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  getBackers = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { address } = req.params;
      const backers = this.campaignService.getBackersForCampaign(address);
      res.json({ success: true, count: backers.length, data: backers });
    } catch (error) {
      next(error);
    }
  };

  getEvents = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { address } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const result = this.campaignService.getEventsForCampaign(address, limit, offset);
      res.json({ success: true, total: result.total, limit, offset, data: result.events });
    } catch (error) {
      next(error);
    }
  };

  getContributionsByWallet = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { wallet } = req.params;
      const contributions = this.campaignService.getContributionsByWallet(wallet);
      res.json({ success: true, count: contributions.length, data: contributions });
    } catch (error) {
      next(error);
    }
  };
}

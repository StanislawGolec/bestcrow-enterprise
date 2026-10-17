import { Campaign, Backer, EventLog, CampaignState } from '../domain/models.js';
import { CampaignRepository } from '../repositories/campaign_repository.js';
import { BackerRepository } from '../repositories/backer_repository.js';
import { EventRepository } from '../repositories/event_repository.js';
import { NotFoundError, ValidationError } from '../domain/errors.js';

export class CampaignService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly backerRepository: BackerRepository,
    private readonly eventRepository: EventRepository
  ) {}

  getCampaignByAddress(address: string): Campaign {
    const campaign = this.campaignRepository.findById(address);
    if (!campaign) {
      throw new NotFoundError('Campaign', address);
    }
    return campaign;
  }

  listCampaigns(statusFilter?: CampaignState): Campaign[] {
    return this.campaignRepository.findAll(statusFilter);
  }

  updateCampaignMetadata(
    address: string,
    metadata: { title?: string; description?: string; website?: string; imageUrl?: string }
  ): Campaign {
    const existing = this.campaignRepository.findById(address);
    if (!existing) {
      throw new NotFoundError('Campaign', address);
    }

    if (metadata.title && metadata.title.trim().length === 0) {
      throw new ValidationError('Campaign title cannot be empty.');
    }

    this.campaignRepository.updateMetadata(address, metadata);
    return this.getCampaignByAddress(address);
  }

  getBackersForCampaign(campaignAddress: string): Backer[] {
    this.getCampaignByAddress(campaignAddress);
    return this.backerRepository.findAllByCampaign(campaignAddress);
  }

  getContributionsByWallet(walletAddress: string): Backer[] {
    return this.backerRepository.findAllByWallet(walletAddress);
  }

  getEventsForCampaign(campaignAddress: string, limit: number = 20, offset: number = 0): { events: EventLog[]; total: number } {
    this.getCampaignByAddress(campaignAddress);
    const events = this.eventRepository.findByCampaign(campaignAddress, limit, offset);
    const total = this.eventRepository.countByCampaign(campaignAddress);
    return { events, total };
  }

  registerCampaign(campaign: Campaign): void {
    this.campaignRepository.save(campaign);
  }
}

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SqliteCampaignRepository } from '../src/repositories/campaign_repository.js';
import { SqliteBackerRepository } from '../src/repositories/backer_repository.js';
import { SqliteEventRepository } from '../src/repositories/event_repository.js';
import { CampaignService } from '../src/services/campaign_service.js';
import { Campaign } from '../src/domain/models.js';

describe('CampaignService', () => {
  let database: DatabaseSync;
  let campaignService: CampaignService;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    const campaignRepo = new SqliteCampaignRepository(database);
    const backerRepo = new SqliteBackerRepository(database);
    const eventRepo = new SqliteEventRepository(database);
    campaignService = new CampaignService(campaignRepo, backerRepo, eventRepo);
  });

  afterEach(() => {
    database.close();
  });

  test('should register and retrieve a campaign by address', () => {
    const mockCampaign: Campaign = {
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      creator: 'H7iV8i699m3bK7K7yqQ1V6xWvYyN2cE9b8h1a4z6m5n3',
      campaignId: '1001',
      goalLamports: '10000000000',
      raisedLamports: '0',
      fundingDeadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      contentUri: 1,
      state: 'funding',
      trancheCount: 3,
      currentTranche: 0,
      protocolFeeLamports: '0',
      distributableLamports: '0',
      releasedLamports: '0',
      reservedLamports: '0',
      refundPoolLamports: '0',
      bondForfeited: false,
      bondSettled: false,
      backerCount: 0,
      title: 'Decentralized Autonomous OS',
      description: 'Next gen operating system prototype',
      website: 'https://os.example.com',
      imageUrl: 'https://os.example.com/logo.png',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    campaignService.registerCampaign(mockCampaign);
    const retrieved = campaignService.getCampaignByAddress(mockCampaign.address);

    assert.equal(retrieved.address, mockCampaign.address);
    assert.equal(retrieved.campaignId, mockCampaign.campaignId);
    assert.equal(retrieved.title, mockCampaign.title);
    assert.equal(retrieved.state, 'funding');
  });

  test('should update campaign metadata', () => {
    const mockCampaign: Campaign = {
      address: '9aB8tg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      creator: 'H7iV8i699m3bK7K7yqQ1V6xWvYyN2cE9b8h1a4z6m5n3',
      campaignId: '1002',
      goalLamports: '5000000000',
      raisedLamports: '0',
      fundingDeadline: Math.floor(Date.now() / 1000) + 86400 * 30,
      termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      contentUri: 2,
      state: 'draft',
      trancheCount: 2,
      currentTranche: 0,
      protocolFeeLamports: '0',
      distributableLamports: '0',
      releasedLamports: '0',
      reservedLamports: '0',
      refundPoolLamports: '0',
      bondForfeited: false,
      bondSettled: false,
      backerCount: 0,
      title: null,
      description: null,
      website: null,
      imageUrl: null,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    campaignService.registerCampaign(mockCampaign);

    const updated = campaignService.updateCampaignMetadata(mockCampaign.address, {
      title: 'Updated Title',
      website: 'https://updated.com',
    });

    assert.equal(updated.title, 'Updated Title');
    assert.equal(updated.website, 'https://updated.com');
  });

  test('should throw NotFoundError for non-existent campaign', () => {
    assert.throws(() => {
      campaignService.getCampaignByAddress('non-existent-address');
    }, { name: 'NotFoundError' });
  });
});

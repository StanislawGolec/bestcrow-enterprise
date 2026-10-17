import { DatabaseSync, StatementSync } from 'node:sqlite';
import { Campaign, CampaignState } from '../domain/models.js';

export interface CampaignRepository {
  findById(address: string): Campaign | null;
  findAll(statusFilter?: CampaignState): Campaign[];
  save(campaign: Campaign): void;
  updateMetadata(address: string, metadata: { title?: string; description?: string; website?: string; imageUrl?: string }): void;
}

export class SqliteCampaignRepository implements CampaignRepository {
  private readonly getStatement: StatementSync;
  private readonly listAllStatement: StatementSync;
  private readonly listByStatusStatement: StatementSync;
  private readonly upsertStatement: StatementSync;
  private readonly updateMetadataStatement: StatementSync;

  constructor(private readonly database: DatabaseSync) {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        address                 TEXT PRIMARY KEY,
        creator                 TEXT NOT NULL,
        campaign_id             TEXT NOT NULL,
        goal_lamports           TEXT NOT NULL,
        raised_lamports         TEXT NOT NULL,
        funding_deadline        INTEGER NOT NULL,
        terms_hash              TEXT NOT NULL,
        content_uri             INTEGER NOT NULL,
        state                   TEXT NOT NULL,
        tranche_count           INTEGER NOT NULL,
        current_tranche         INTEGER NOT NULL,
        protocol_fee_lamports   TEXT NOT NULL,
        distributable_lamports  TEXT NOT NULL,
        released_lamports       TEXT NOT NULL,
        reserved_lamports       TEXT NOT NULL,
        refund_pool_lamports    TEXT NOT NULL,
        bond_forfeited          INTEGER NOT NULL,
        bond_settled            INTEGER NOT NULL,
        backer_count            INTEGER NOT NULL DEFAULT 0,
        title                   TEXT,
        description             TEXT,
        website                 TEXT,
        image_url               TEXT,
        created_at              INTEGER NOT NULL,
        updated_at              INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_campaigns_state ON campaigns(state);
      CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator);
    `);

    this.getStatement = this.database.prepare('SELECT * FROM campaigns WHERE address = ?');
    this.listAllStatement = this.database.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC');
    this.listByStatusStatement = this.database.prepare('SELECT * FROM campaigns WHERE state = ? ORDER BY updated_at DESC');
    this.upsertStatement = this.database.prepare(`
      INSERT INTO campaigns (
        address, creator, campaign_id, goal_lamports, raised_lamports,
        funding_deadline, terms_hash, content_uri, state, tranche_count,
        current_tranche, protocol_fee_lamports, distributable_lamports,
        released_lamports, reserved_lamports, refund_pool_lamports,
        bond_forfeited, bond_settled, backer_count, title, description,
        website, image_url, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      ) ON CONFLICT(address) DO UPDATE SET
        raised_lamports = excluded.raised_lamports,
        state = excluded.state,
        current_tranche = excluded.current_tranche,
        protocol_fee_lamports = excluded.protocol_fee_lamports,
        distributable_lamports = excluded.distributable_lamports,
        released_lamports = excluded.released_lamports,
        reserved_lamports = excluded.reserved_lamports,
        refund_pool_lamports = excluded.refund_pool_lamports,
        bond_forfeited = excluded.bond_forfeited,
        bond_settled = excluded.bond_settled,
        backer_count = excluded.backer_count,
        updated_at = excluded.updated_at
    `);
    this.updateMetadataStatement = this.database.prepare(`
      UPDATE campaigns
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          website = COALESCE(?, website),
          image_url = COALESCE(?, image_url),
          updated_at = ?
      WHERE address = ?
    `);
  }

  findById(address: string): Campaign | null {
    const row = this.getStatement.get(address) as Record<string, unknown> | undefined;
    return row ? this.mapRowToCampaign(row) : null;
  }

  findAll(statusFilter?: CampaignState): Campaign[] {
    const rows = statusFilter
      ? (this.listByStatusStatement.all(statusFilter) as Record<string, unknown>[])
      : (this.listAllStatement.all() as Record<string, unknown>[]);
    return rows.map(r => this.mapRowToCampaign(r));
  }

  save(campaign: Campaign): void {
    const now = Math.floor(Date.now() / 1000);
    this.upsertStatement.run(
      campaign.address,
      campaign.creator,
      campaign.campaignId,
      campaign.goalLamports,
      campaign.raisedLamports,
      campaign.fundingDeadline,
      campaign.termsHash,
      campaign.contentUri,
      campaign.state,
      campaign.trancheCount,
      campaign.currentTranche,
      campaign.protocolFeeLamports,
      campaign.distributableLamports,
      campaign.releasedLamports,
      campaign.reservedLamports,
      campaign.refundPoolLamports,
      campaign.bondForfeited ? 1 : 0,
      campaign.bondSettled ? 1 : 0,
      campaign.backerCount,
      campaign.title ?? null,
      campaign.description ?? null,
      campaign.website ?? null,
      campaign.imageUrl ?? null,
      campaign.createdAt || now,
      now
    );
  }

  updateMetadata(address: string, metadata: { title?: string; description?: string; website?: string; imageUrl?: string }): void {
    const now = Math.floor(Date.now() / 1000);
    this.updateMetadataStatement.run(
      metadata.title ?? null,
      metadata.description ?? null,
      metadata.website ?? null,
      metadata.imageUrl ?? null,
      now,
      address
    );
  }

  private mapRowToCampaign(row: Record<string, unknown>): Campaign {
    return {
      address: String(row.address),
      creator: String(row.creator),
      campaignId: String(row.campaign_id),
      goalLamports: String(row.goal_lamports),
      raisedLamports: String(row.raised_lamports),
      fundingDeadline: Number(row.funding_deadline),
      termsHash: String(row.terms_hash),
      contentUri: Number(row.content_uri),
      state: row.state as CampaignState,
      trancheCount: Number(row.tranche_count),
      currentTranche: Number(row.current_tranche),
      protocolFeeLamports: String(row.protocol_fee_lamports),
      distributableLamports: String(row.distributable_lamports),
      releasedLamports: String(row.released_lamports),
      reservedLamports: String(row.reserved_lamports),
      refundPoolLamports: String(row.refund_pool_lamports),
      bondForfeited: Boolean(row.bond_forfeited),
      bondSettled: Boolean(row.bond_settled),
      backerCount: Number(row.backer_count),
      title: row.title ? String(row.title) : null,
      description: row.description ? String(row.description) : null,
      website: row.website ? String(row.website) : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}

import { DatabaseSync, StatementSync } from 'node:sqlite';
import { EventLog } from '../domain/models.js';

export interface EventRepository {
  save(event: EventLog): boolean;
  findByCampaign(campaignAddress: string, limit: number, offset: number): EventLog[];
  countByCampaign(campaignAddress: string): number;
}

export class SqliteEventRepository implements EventRepository {
  private readonly insertStatement: StatementSync;
  private readonly listByCampaignStatement: StatementSync;
  private readonly countByCampaignStatement: StatementSync;

  constructor(private readonly database: DatabaseSync) {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        signature         TEXT NOT NULL,
        slot              INTEGER NOT NULL DEFAULT 0,
        block_time        INTEGER,
        event_name        TEXT NOT NULL,
        campaign_address  TEXT,
        backer_wallet     TEXT,
        amount_lamports   TEXT,
        payload           TEXT NOT NULL,
        created_at        INTEGER NOT NULL,
        UNIQUE(signature, event_name, backer_wallet)
      );
      CREATE INDEX IF NOT EXISTS idx_events_campaign ON event_logs(campaign_address);
      CREATE INDEX IF NOT EXISTS idx_events_slot ON event_logs(slot);
    `);

    this.insertStatement = this.database.prepare(`
      INSERT OR IGNORE INTO event_logs (
        signature, slot, block_time, event_name, campaign_address,
        backer_wallet, amount_lamports, payload, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.listByCampaignStatement = this.database.prepare(`
      SELECT * FROM event_logs
      WHERE campaign_address = ?
      ORDER BY slot DESC, id DESC
      LIMIT ? OFFSET ?
    `);
    this.countByCampaignStatement = this.database.prepare(
      'SELECT COUNT(*) as count FROM event_logs WHERE campaign_address = ?'
    );
  }

  save(event: EventLog): boolean {
    const now = Math.floor(Date.now() / 1000);
    const result = this.insertStatement.run(
      event.signature,
      event.slot,
      event.blockTime,
      event.eventName,
      event.campaignAddress,
      event.backerWallet,
      event.amountLamports,
      event.payload,
      now
    );
    return Number(result.changes) > 0;
  }

  findByCampaign(campaignAddress: string, limit: number, offset: number): EventLog[] {
    const rows = this.listByCampaignStatement.all(campaignAddress, limit, offset) as Record<string, unknown>[];
    return rows.map(r => this.mapRowToEvent(r));
  }

  countByCampaign(campaignAddress: string): number {
    const row = this.countByCampaignStatement.get(campaignAddress) as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }

  private mapRowToEvent(row: Record<string, unknown>): EventLog {
    return {
      id: Number(row.id),
      signature: String(row.signature),
      slot: Number(row.slot),
      blockTime: row.block_time !== null ? Number(row.block_time) : null,
      eventName: String(row.event_name),
      campaignAddress: row.campaign_address ? String(row.campaign_address) : null,
      backerWallet: row.backer_wallet ? String(row.backer_wallet) : null,
      amountLamports: row.amount_lamports ? String(row.amount_lamports) : null,
      payload: String(row.payload),
      createdAt: Number(row.created_at),
    };
  }
}

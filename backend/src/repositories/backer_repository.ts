import { DatabaseSync, StatementSync } from 'node:sqlite';
import { Backer } from '../domain/models.js';

export interface BackerRepository {
  findByCampaignAndWallet(campaignAddress: string, backerWallet: string): Backer | null;
  findAllByCampaign(campaignAddress: string): Backer[];
  findAllByWallet(backerWallet: string): Backer[];
  save(backer: Backer): void;
}

export class SqliteBackerRepository implements BackerRepository {
  private readonly getStatement: StatementSync;
  private readonly listByCampaignStatement: StatementSync;
  private readonly listByWalletStatement: StatementSync;
  private readonly upsertStatement: StatementSync;

  constructor(private readonly database: DatabaseSync) {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS backers (
        campaign_address            TEXT NOT NULL,
        backer_wallet               TEXT NOT NULL,
        amount_lamports             TEXT NOT NULL,
        cancelled                   INTEGER NOT NULL DEFAULT 0,
        refund_claimed              INTEGER NOT NULL DEFAULT 0,
        termination_refund_claimed  INTEGER NOT NULL DEFAULT 0,
        updated_at                  INTEGER NOT NULL,
        PRIMARY KEY (campaign_address, backer_wallet)
      );
      CREATE INDEX IF NOT EXISTS idx_backers_wallet ON backers(backer_wallet);
    `);

    this.getStatement = this.database.prepare(
      'SELECT * FROM backers WHERE campaign_address = ? AND backer_wallet = ?'
    );
    this.listByCampaignStatement = this.database.prepare(
      'SELECT * FROM backers WHERE campaign_address = ? ORDER BY LENGTH(amount_lamports) DESC, amount_lamports DESC'
    );
    this.listByWalletStatement = this.database.prepare(
      'SELECT * FROM backers WHERE backer_wallet = ? ORDER BY updated_at DESC'
    );
    this.upsertStatement = this.database.prepare(`
      INSERT INTO backers (
        campaign_address, backer_wallet, amount_lamports, cancelled,
        refund_claimed, termination_refund_claimed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(campaign_address, backer_wallet) DO UPDATE SET
        amount_lamports = excluded.amount_lamports,
        cancelled = excluded.cancelled,
        refund_claimed = excluded.refund_claimed,
        termination_refund_claimed = excluded.termination_refund_claimed,
        updated_at = excluded.updated_at
    `);
  }

  findByCampaignAndWallet(campaignAddress: string, backerWallet: string): Backer | null {
    const row = this.getStatement.get(campaignAddress, backerWallet) as Record<string, unknown> | undefined;
    return row ? this.mapRowToBacker(row) : null;
  }

  findAllByCampaign(campaignAddress: string): Backer[] {
    const rows = this.listByCampaignStatement.all(campaignAddress) as Record<string, unknown>[];
    return rows.map(r => this.mapRowToBacker(r));
  }

  findAllByWallet(backerWallet: string): Backer[] {
    const rows = this.listByWalletStatement.all(backerWallet) as Record<string, unknown>[];
    return rows.map(r => this.mapRowToBacker(r));
  }

  save(backer: Backer): void {
    const now = Math.floor(Date.now() / 1000);
    this.upsertStatement.run(
      backer.campaignAddress,
      backer.backerWallet,
      backer.amountLamports,
      backer.cancelled ? 1 : 0,
      backer.refundClaimed ? 1 : 0,
      backer.terminationRefundClaimed ? 1 : 0,
      now
    );
  }

  private mapRowToBacker(row: Record<string, unknown>): Backer {
    return {
      campaignAddress: String(row.campaign_address),
      backerWallet: String(row.backer_wallet),
      amountLamports: String(row.amount_lamports),
      cancelled: Boolean(row.cancelled),
      refundClaimed: Boolean(row.refund_claimed),
      terminationRefundClaimed: Boolean(row.termination_refund_claimed),
      updatedAt: Number(row.updated_at),
    };
  }
}

import { DatabaseSync, StatementSync } from 'node:sqlite';
import { ProcessedTransaction } from '../domain/events.js';

export interface ProcessedTransactionRepository {
  markProcessed(tx: ProcessedTransaction): boolean;
  isProcessed(signature: string): boolean;
  findBySignature(signature: string): ProcessedTransaction | null;
  count(): number;
}

export class SqliteProcessedTransactionRepository implements ProcessedTransactionRepository {
  private readonly insertStatement: StatementSync;
  private readonly checkStatement: StatementSync;
  private readonly findStatement: StatementSync;
  private readonly countStatement: StatementSync;

  constructor(private readonly database: DatabaseSync) {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS processed_transactions (
        signature             TEXT PRIMARY KEY,
        slot                  INTEGER NOT NULL,
        block_time            INTEGER,
        confirmation_status   TEXT NOT NULL,
        processed_at          INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_processed_tx_slot ON processed_transactions(slot);
    `);

    this.insertStatement = this.database.prepare(`
      INSERT OR IGNORE INTO processed_transactions (
        signature, slot, block_time, confirmation_status, processed_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    this.checkStatement = this.database.prepare(
      'SELECT 1 FROM processed_transactions WHERE signature = ? LIMIT 1'
    );

    this.findStatement = this.database.prepare(
      'SELECT * FROM processed_transactions WHERE signature = ?'
    );

    this.countStatement = this.database.prepare(
      'SELECT COUNT(*) as count FROM processed_transactions'
    );
  }

  markProcessed(tx: ProcessedTransaction): boolean {
    const result = this.insertStatement.run(
      tx.signature,
      tx.slot,
      tx.blockTime,
      tx.confirmationStatus,
      tx.processedAt
    );
    return Number(result.changes) > 0;
  }

  isProcessed(signature: string): boolean {
    const row = this.checkStatement.get(signature);
    return row !== undefined;
  }

  findBySignature(signature: string): ProcessedTransaction | null {
    const row = this.findStatement.get(signature) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      signature: String(row.signature),
      slot: Number(row.slot),
      blockTime: row.block_time !== null ? Number(row.block_time) : null,
      confirmationStatus: row.confirmation_status as ProcessedTransaction['confirmationStatus'],
      processedAt: Number(row.processed_at),
    };
  }

  count(): number {
    const row = this.countStatement.get() as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }
}

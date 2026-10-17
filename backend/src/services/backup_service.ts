import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface SnapshotMetadata {
  snapshotPath: string;
  filename: string;
  timestamp: number;
  sizeBytes: number;
  isIntegrityVerified: boolean;
}

export interface BackupServiceOptions {
  backupDirectory?: string;
  retentionLimit?: number;
}

export class DatabaseBackupService {
  private readonly backupDirectory: string;
  private readonly retentionLimit: number;

  constructor(
    private readonly database: DatabaseSync,
    options: BackupServiceOptions = {}
  ) {
    this.backupDirectory = resolve(options.backupDirectory || './data/backups');
    this.retentionLimit = options.retentionLimit || 5;

    if (!existsSync(this.backupDirectory)) {
      mkdirSync(this.backupDirectory, { recursive: true });
    }
  }

  createSnapshot(customFilename?: string, autoRotate: boolean = false): SnapshotMetadata {
    const timestamp = Date.now();
    const filename = customFilename || `bestcrow_snapshot_${timestamp}.sqlite`;
    const snapshotPath = join(this.backupDirectory, filename);

    // Remove if exists to allow clean VACUUM INTO
    if (existsSync(snapshotPath)) {
      unlinkSync(snapshotPath);
    }

    // Verify database integrity before snapshot
    const isIntegrityVerified = this.verifyDatabaseIntegrity();

    // Execute non-blocking online snapshot using SQLite VACUUM INTO
    const escapedPath = snapshotPath.replace(/'/g, "''");
    this.database.exec(`VACUUM INTO '${escapedPath}';`);

    const stats = statSync(snapshotPath);

    // Apply retention rotation if requested
    if (autoRotate) {
      this.rotateSnapshots();
    }

    return {
      snapshotPath,
      filename,
      timestamp,
      sizeBytes: stats.size,
      isIntegrityVerified,
    };
  }

  verifyDatabaseIntegrity(targetDatabase?: DatabaseSync): boolean {
    const db = targetDatabase || this.database;
    try {
      const row = db.prepare('PRAGMA integrity_check;').get() as { integrity_check?: string } | undefined;
      return row?.integrity_check === 'ok';
    } catch {
      return false;
    }
  }

  verifySnapshot(snapshotPath: string): boolean {
    if (!existsSync(snapshotPath)) return false;
    let snapshotDb: DatabaseSync | null = null;
    try {
      snapshotDb = new DatabaseSync(snapshotPath);
      const isOk = this.verifyDatabaseIntegrity(snapshotDb);
      return isOk;
    } catch {
      return false;
    } finally {
      if (snapshotDb) {
        snapshotDb.close();
      }
    }
  }

  listSnapshots(): SnapshotMetadata[] {
    if (!existsSync(this.backupDirectory)) return [];

    const files = readdirSync(this.backupDirectory).filter((f) => f.endsWith('.sqlite'));
    const snapshots: SnapshotMetadata[] = [];

    for (const file of files) {
      const fullPath = join(this.backupDirectory, file);
      try {
        const stats = statSync(fullPath);
        snapshots.push({
          snapshotPath: fullPath,
          filename: file,
          timestamp: stats.mtimeMs,
          sizeBytes: stats.size,
          isIntegrityVerified: true,
        });
      } catch {
        // Skip inaccessible files
      }
    }

    return snapshots.sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return b.filename.localeCompare(a.filename);
    });
  }

  rotateSnapshots(retentionLimit?: number): number {
    const limit = retentionLimit ?? this.retentionLimit;
    const snapshots = this.listSnapshots();
    if (snapshots.length <= limit) {
      return 0;
    }

    const toDelete = snapshots.slice(limit);
    let deletedCount = 0;

    for (const snap of toDelete) {
      try {
        if (existsSync(snap.snapshotPath)) {
          unlinkSync(snap.snapshotPath);
          deletedCount += 1;
        }
      } catch {
        // Ignore deletion failures during rotation
      }
    }

    return deletedCount;
  }
}

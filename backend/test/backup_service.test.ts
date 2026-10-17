import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseBackupService } from '../src/services/backup_service.js';
import { SqliteCampaignRepository } from '../src/repositories/campaign_repository.js';
import { SqliteBackerRepository } from '../src/repositories/backer_repository.js';

test('DatabaseBackupService WAL snapshot & disaster recovery', async (t) => {
  const testDir = resolve('./data/test_backups');
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  mkdirSync(testDir, { recursive: true });

  const primaryDbPath = join(testDir, 'primary_test.sqlite');
  if (existsSync(primaryDbPath)) {
    rmSync(primaryDbPath);
  }

  const db = new DatabaseSync(primaryDbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  const campaignRepo = new SqliteCampaignRepository(db);
  const backerRepo = new SqliteBackerRepository(db);

  // Pre-populate data
  campaignRepo.save({
    address: 'camp_recovery_001',
    creator: 'creator_recovery_wallet',
    campaignId: 'dr_drill_1',
    goalLamports: '10000000000',
    raisedLamports: '5000000000',
    fundingDeadline: Math.floor(Date.now() / 1000) + 86400,
    termsHash: '0xhash1',
    contentUri: 1,
    state: 'funding',
    trancheCount: 2,
    currentTranche: 0,
    protocolFeeLamports: '50000000',
    distributableLamports: '4950000000',
    releasedLamports: '0',
    reservedLamports: '0',
    refundPoolLamports: '0',
    bondForfeited: false,
    bondSettled: false,
    backerCount: 1,
    title: 'Disaster Recovery Campaign',
    description: 'Verifying zero data loss under disaster recovery snapshot restoration.',
    website: null,
    imageUrl: null,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  });

  backerRepo.save({
    campaignAddress: 'camp_recovery_001',
    backerWallet: 'backer_recovery_wallet',
    amountLamports: '5000000000',
    cancelled: false,
    refundClaimed: false,
    terminationRefundClaimed: false,
    updatedAt: Math.floor(Date.now() / 1000),
  });

  const backupService = new DatabaseBackupService(db, {
    backupDirectory: testDir,
    retentionLimit: 3,
  });

  await t.test('should verify database integrity returns true for valid WAL database', () => {
    const isHealthy = backupService.verifyDatabaseIntegrity();
    assert.strictEqual(isHealthy, true, 'Database integrity check must return true');
  });

  let createdSnapshotPath = '';
  await t.test('should create point-in-time snapshot and verify structural integrity', () => {
    const snapshot = backupService.createSnapshot('dr_snapshot_test.sqlite');
    createdSnapshotPath = snapshot.snapshotPath;

    assert.ok(existsSync(createdSnapshotPath), 'Snapshot file must exist on disk');
    assert.strictEqual(snapshot.isIntegrityVerified, true, 'Snapshot must pass PRAGMA integrity_check');
    assert.ok(snapshot.sizeBytes > 0, 'Snapshot file must not be empty');
  });

  await t.test('should restore 100% of state from snapshot with zero data loss', () => {
    // Open isolated snapshot database to simulate disaster recovery restore
    const restoredDb = new DatabaseSync(createdSnapshotPath);
    const campaignRow = restoredDb.prepare("SELECT title, raised_lamports FROM campaigns WHERE address = 'camp_recovery_001'").get() as { title: string; raised_lamports: string };
    assert.ok(campaignRow, 'Campaign must be recovered from snapshot');
    assert.strictEqual(campaignRow.title, 'Disaster Recovery Campaign');
    assert.strictEqual(campaignRow.raised_lamports, '5000000000');

    const backerRow = restoredDb.prepare("SELECT backer_wallet FROM backers WHERE campaign_address = 'camp_recovery_001'").get() as { backer_wallet: string };
    assert.ok(backerRow, 'Backer must be recovered from snapshot');
    assert.strictEqual(backerRow.backer_wallet, 'backer_recovery_wallet');

    restoredDb.close();
  });

  const rotationDir = resolve('./data/test_rotation_backups');
  await t.test('should enforce snapshot retention rotation and prune oldest snapshots', () => {
    if (existsSync(rotationDir)) {
      rmSync(rotationDir, { recursive: true, force: true });
    }
    mkdirSync(rotationDir, { recursive: true });

    const rotationService = new DatabaseBackupService(db, {
      backupDirectory: rotationDir,
      retentionLimit: 3,
    });

    rotationService.createSnapshot('snap_1.sqlite');
    rotationService.createSnapshot('snap_2.sqlite');
    rotationService.createSnapshot('snap_3.sqlite');
    rotationService.createSnapshot('snap_4.sqlite');

    const deleted = rotationService.rotateSnapshots(3);
    assert.strictEqual(deleted, 1, 'Must have deleted exactly 1 oldest snapshot');

    const remaining = rotationService.listSnapshots();
    assert.strictEqual(remaining.length, 3, 'Must retain exactly 3 snapshots after rotation');
  });

  // Cleanup test files
  t.after(() => {
    try {
      db.close();
    } catch {
      // Ignore
    }
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      if (existsSync(rotationDir)) {
        rmSync(rotationDir, { recursive: true, force: true });
      }
    } catch {
      // Windows lock release tolerance
    }
  });
});

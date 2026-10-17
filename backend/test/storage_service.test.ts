import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ArweaveStorageService,
  canonicalJsonStringify,
  MilestoneProofPayload,
} from '../src/services/storage_service.js';

describe('ArweaveStorageService', () => {
  const samplePayload: MilestoneProofPayload = {
    campaignAddress: 'BCrowTestCampaign11111111111111111111111111',
    trancheIndex: 0,
    title: 'MVP Smart Contract Deployment',
    summary: 'Deployed hardened Anchor smart contracts to Solana Devnet with 100% test coverage.',
    deliverables: [
      'Rust program compiled to BPF target',
      'Anchor IDL generated and published',
      'Deterministic PDA seeds verified',
    ],
    repositoryCommitSha: '84d543d81b49911910100a7b483c66a87754ef6e',
    externalDemoUrl: 'https://explorer.solana.com/address/3jGgPRa4gH25wfL49E3TAtpix5ePUZKWrQLT83eNZBVr?cluster=devnet',
    submittedAt: 1718000000000,
    authorWallet: 'CreatorWallet11111111111111111111111111111',
  };

  it('should upload evidence and compute deterministic SHA-256 hash', async () => {
    const service = new ArweaveStorageService();
    const result = await service.uploadEvidence(samplePayload);

    assert.ok(result.contentUri.startsWith('arweave://'));
    assert.equal(result.evidenceHashHex.length, 64);
    assert.equal(result.evidenceHashBytes.length, 32);
    assert.equal(result.verified, true);
  });

  it('should retrieve uploaded evidence by contentUri and by raw hash', async () => {
    const service = new ArweaveStorageService();
    const result = await service.uploadEvidence(samplePayload);

    const byUri = await service.getEvidence(result.contentUri);
    assert.deepEqual(byUri, samplePayload);

    const byHash = await service.getEvidence(result.evidenceHashHex);
    assert.deepEqual(byHash, samplePayload);

    const nonExistent = await service.getEvidence('arweave://unknown123456');
    assert.equal(nonExistent, null);
  });

  it('should verify integrity successfully when hash matches and detect tampering', async () => {
    const service = new ArweaveStorageService();
    const result = await service.uploadEvidence(samplePayload);

    const validWith0x = await service.verifyIntegrity(result.contentUri, `0x${result.evidenceHashHex}`);
    assert.equal(validWith0x, true);

    const validWithout0x = await service.verifyIntegrity(result.contentUri, result.evidenceHashHex.toUpperCase());
    assert.equal(validWithout0x, true);

    const tampered = await service.verifyIntegrity(result.contentUri, '0000000000000000000000000000000000000000000000000000000000000000');
    assert.equal(tampered, false);
  });

  it('should generate identical canonical JSON string regardless of key insertion order', () => {
    const objA = {
      b: 2,
      a: 1,
      nested: { z: 26, y: 25 },
    };

    const objB = {
      nested: { y: 25, z: 26 },
      a: 1,
      b: 2,
    };

    assert.equal(canonicalJsonStringify(objA), canonicalJsonStringify(objB));
  });
});

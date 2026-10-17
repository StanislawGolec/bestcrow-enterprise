import crypto from 'node:crypto';

export interface MilestoneProofPayload {
  campaignAddress: string;
  trancheIndex: number;
  title: string;
  summary: string;
  deliverables: string[];
  repositoryCommitSha?: string;
  externalDemoUrl?: string;
  submittedAt: number;
  authorWallet: string;
}

export interface StorageUploadResult {
  contentUri: string;
  evidenceHashHex: string;
  evidenceHashBytes: number[];
  verified: boolean;
  timestamp: number;
}

export interface StorageService {
  uploadEvidence(payload: MilestoneProofPayload): Promise<StorageUploadResult>;
  getEvidence(contentUriOrHash: string): Promise<MilestoneProofPayload | null>;
  verifyIntegrity(contentUriOrHash: string, expectedHashHex: string): Promise<boolean>;
}

export function canonicalJsonStringify(data: unknown): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return `[${data.map((item) => canonicalJsonStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(data as Record<string, unknown>)
    .filter(([_, value]) => value !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const serializedProps = entries.map(
    ([key, value]) => `${JSON.stringify(key)}:${canonicalJsonStringify(value)}`
  );

  return `{${serializedProps.join(',')}}`;
}

export class ArweaveStorageService implements StorageService {
  private readonly memoryStore = new Map<string, MilestoneProofPayload>();

  async uploadEvidence(payload: MilestoneProofPayload): Promise<StorageUploadResult> {
    const canonicalString = canonicalJsonStringify(payload);
    const hash = crypto.createHash('sha256').update(canonicalString, 'utf8').digest();
    const evidenceHashHex = hash.toString('hex');
    const evidenceHashBytes = Array.from(hash);

    const contentUri = `arweave://${evidenceHashHex}`;

    this.memoryStore.set(contentUri, payload);
    this.memoryStore.set(evidenceHashHex, payload);

    return {
      contentUri,
      evidenceHashHex,
      evidenceHashBytes,
      verified: true,
      timestamp: Date.now(),
    };
  }

  async getEvidence(contentUriOrHash: string): Promise<MilestoneProofPayload | null> {
    const cleanKey = contentUriOrHash.replace('arweave://', '');
    if (this.memoryStore.has(cleanKey)) {
      return this.memoryStore.get(cleanKey)!;
    }
    if (this.memoryStore.has(contentUriOrHash)) {
      return this.memoryStore.get(contentUriOrHash)!;
    }
    return null;
  }

  async verifyIntegrity(contentUriOrHash: string, expectedHashHex: string): Promise<boolean> {
    const payload = await this.getEvidence(contentUriOrHash);
    if (!payload) {
      return false;
    }

    const canonicalString = canonicalJsonStringify(payload);
    const computedHashHex = crypto
      .createHash('sha256')
      .update(canonicalString, 'utf8')
      .digest('hex');

    const cleanExpected = expectedHashHex.startsWith('0x')
      ? expectedHashHex.slice(2).toLowerCase()
      : expectedHashHex.toLowerCase();

    return computedHashHex.toLowerCase() === cleanExpected;
  }
}

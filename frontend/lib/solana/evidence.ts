import { MilestoneProofMetadata } from '../types';

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

export function bytesToHex(bytes: number[] | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }
  return bytes;
}

export function normalizeEvidenceBytes(bytes: number[] | Uint8Array): number[] {
  const raw = Array.from(bytes);
  if (raw.length === 32) {
    return raw;
  }
  const normalized = new Array(32).fill(0);
  for (let i = 0; i < Math.min(32, raw.length); i++) {
    normalized[i] = raw[i];
  }
  return normalized;
}

export async function computeEvidenceHash(
  metadata: MilestoneProofMetadata
): Promise<{
  hex: string;
  bytes: number[];
  uint8Array: Uint8Array;
}> {
  const canonicalString = canonicalJsonStringify(metadata);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const uint8Array = new Uint8Array(hashBuffer);
  const bytes = Array.from(uint8Array);
  const hex = bytesToHex(bytes);

  return {
    hex,
    bytes,
    uint8Array,
  };
}

export async function verifyEvidenceHash(
  metadata: MilestoneProofMetadata,
  expectedHash: string | number[] | Uint8Array
): Promise<boolean> {
  const computed = await computeEvidenceHash(metadata);
  const expectedHex =
    typeof expectedHash === 'string'
      ? expectedHash.startsWith('0x')
        ? expectedHash.slice(2).toLowerCase()
        : expectedHash.toLowerCase()
      : bytesToHex(expectedHash).toLowerCase();

  return computed.hex.toLowerCase() === expectedHex;
}

export function formatEvidenceHash(hash: string | number[] | Uint8Array): string {
  const hex = typeof hash === 'string' ? hash : bytesToHex(hash);
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length <= 12) {
    return `0x${clean}`;
  }
  return `0x${clean.slice(0, 6)}...${clean.slice(-6)}`;
}

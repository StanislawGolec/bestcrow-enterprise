import { address, Address, getProgramDerivedAddress } from '@solana/kit';
import { PROGRAM_ID } from '../constants';

export async function findCampaignAddress(creator: Address, campaignId: bigint): Promise<Address> {
  const program = address(PROGRAM_ID);
  const idBuffer = new Uint8Array(8);
  new DataView(idBuffer.buffer).setBigUint64(0, campaignId, true);

  const [pda] = await getProgramDerivedAddress({
    programAddress: program,
    seeds: [new TextEncoder().encode('campaign'), creator, idBuffer],
  });
  return pda;
}

export async function findTrancheAddress(campaign: Address, index: number): Promise<Address> {
  const program = address(PROGRAM_ID);
  const [pda] = await getProgramDerivedAddress({
    programAddress: program,
    seeds: [new TextEncoder().encode('tranche'), campaign, new Uint8Array([index])],
  });
  return pda;
}

export async function findBackerAddress(campaign: Address, backer: Address): Promise<Address> {
  const program = address(PROGRAM_ID);
  const [pda] = await getProgramDerivedAddress({
    programAddress: program,
    seeds: [new TextEncoder().encode('backer'), campaign, backer],
  });
  return pda;
}

export async function findVaultAddress(campaign: Address): Promise<Address> {
  const program = address(PROGRAM_ID);
  const [pda] = await getProgramDerivedAddress({
    programAddress: program,
    seeds: [new TextEncoder().encode('vault'), campaign],
  });
  return pda;
}

export async function findBondAddress(campaign: Address): Promise<Address> {
  const program = address(PROGRAM_ID);
  const [pda] = await getProgramDerivedAddress({
    programAddress: program,
    seeds: [new TextEncoder().encode('bond'), campaign],
  });
  return pda;
}

export async function findVoteAddress(tranche: Address, round: number, backer: Address): Promise<Address> {
  const program = address(PROGRAM_ID);
  const [pda] = await getProgramDerivedAddress({
    programAddress: program,
    seeds: [new TextEncoder().encode('vote'), tranche, new Uint8Array([round]), backer],
  });
  return pda;
}


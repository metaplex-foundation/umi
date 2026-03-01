import {
  type PublicKey,
  type RpcInterface,
  type MaybeRpcAccount,
  type RpcAccount,
  type Context,
  type EddsaInterface,
  type Pda,
  publicKey,
  publicKeyBytes,
  createNullRpc,
  createNullEddsa,
} from '@metaplex-foundation/umi';
import { TOKEN_METADATA_PROGRAM_ID } from '../src/parsers';

// --- Test public keys ---

export const MINT_A = publicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);
export const OWNER_A = publicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111'
);
export const AUTHORITY_A = publicKey(
  'So11111111111111111111111111111111111111112'
);
export const CREATOR_A = publicKey(
  '11111111111111111111111111111111'
);

// --- Binary builders ---

class BinaryWriter {
  private parts: Uint8Array[] = [];

  u8(val: number): this {
    this.parts.push(new Uint8Array([val]));
    return this;
  }

  u16(val: number): this {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setUint16(0, val, true);
    this.parts.push(buf);
    return this;
  }

  u32(val: number): this {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, val, true);
    this.parts.push(buf);
    return this;
  }

  u64(val: bigint): this {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigUint64(0, val, true);
    this.parts.push(buf);
    return this;
  }

  bool(val: boolean): this {
    return this.u8(val ? 1 : 0);
  }

  publicKey(key: PublicKey): this {
    this.parts.push(publicKeyBytes(key));
    return this;
  }

  /** Borsh string: u32 length + utf8 bytes, padded to fixedLen with nulls */
  string(val: string, fixedLen: number): this {
    const padded = val + '\0'.repeat(Math.max(0, fixedLen - val.length));
    const bytes = new TextEncoder().encode(padded);
    this.u32(bytes.length);
    this.parts.push(bytes);
    return this;
  }

  optionPublicKey(key: PublicKey | null): this {
    if (key) {
      this.u32(1);
      this.publicKey(key);
    } else {
      this.u32(0);
      // Still write 32 zero bytes for the pubkey slot
      this.parts.push(new Uint8Array(32));
    }
    return this;
  }

  build(): Uint8Array {
    const totalLen = this.parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const part of this.parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }
}

export function buildMetadataAccountData(opts: {
  updateAuthority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Array<{ address: PublicKey; verified: boolean; share: number }> | null;
  primarySaleHappened: boolean;
  isMutable: boolean;
}): Uint8Array {
  const w = new BinaryWriter();
  w.u8(4); // MetadataV1 key
  w.publicKey(opts.updateAuthority);
  w.publicKey(opts.mint);
  w.string(opts.name, 32);
  w.string(opts.symbol, 10);
  w.string(opts.uri, 200);
  w.u16(opts.sellerFeeBasisPoints);

  if (opts.creators) {
    w.bool(true);
    w.u32(opts.creators.length);
    for (const c of opts.creators) {
      w.publicKey(c.address);
      w.bool(c.verified);
      w.u8(c.share);
    }
  } else {
    w.bool(false);
  }

  w.bool(opts.primarySaleHappened);
  w.bool(opts.isMutable);

  return w.build();
}

export function buildMintAccountData(opts: {
  mintAuthority: PublicKey | null;
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: PublicKey | null;
}): Uint8Array {
  const w = new BinaryWriter();
  w.optionPublicKey(opts.mintAuthority);
  w.u64(opts.supply);
  w.u8(opts.decimals);
  w.bool(opts.isInitialized);
  w.optionPublicKey(opts.freezeAuthority);
  return w.build();
}

export function buildTokenAccountData(opts: {
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
}): Uint8Array {
  // Token account is 165 bytes total
  const w = new BinaryWriter();
  w.publicKey(opts.mint);
  w.publicKey(opts.owner);
  w.u64(opts.amount);
  // Pad remaining bytes to reach 165 total (32+32+8=72, need 93 more)
  const data = w.build();
  const padded = new Uint8Array(165);
  padded.set(data);
  return padded;
}

// --- Mock context builder ---

type AccountMap = Map<string, { data: Uint8Array; owner: PublicKey }>;
type ProgramAccountMap = Map<
  string,
  Array<{ publicKey: PublicKey; data: Uint8Array; owner: PublicKey }>
>;

export function createMockContext(opts: {
  accounts?: AccountMap;
  programAccounts?: ProgramAccountMap;
  pdaMap?: Map<string, PublicKey>;
}): Pick<Context, 'rpc' | 'eddsa'> {
  const accounts = opts.accounts ?? new Map();
  const programAccounts = opts.programAccounts ?? new Map();
  const pdaMap = opts.pdaMap ?? new Map();

  const rpc: RpcInterface = {
    ...createNullRpc(),
    getEndpoint: () => 'http://localhost:8899',
    getCluster: () => 'custom',
    getAccount: async (pk: PublicKey): Promise<MaybeRpcAccount> => {
      const entry = accounts.get(pk);
      if (!entry) {
        return { exists: false, publicKey: pk };
      }
      return {
        exists: true,
        publicKey: pk,
        data: entry.data,
        executable: false,
        owner: entry.owner,
        lamports: { basisPoints: 1000000n, identifier: 'SOL', decimals: 9 },
      };
    },
    getProgramAccounts: async (
      programId: PublicKey,
      options?: any
    ): Promise<RpcAccount[]> => {
      type Entry = { publicKey: PublicKey; data: Uint8Array; owner: PublicKey };
      const all: Entry[] = programAccounts.get(programId) ?? [];
      let filtered: Entry[] = all;

      if (options?.filters) {
        for (const filter of options.filters) {
          if ('dataSize' in filter) {
            filtered = filtered.filter(
              (a: Entry) => a.data.length === filter.dataSize
            );
          }
          if ('memcmp' in filter) {
            const { offset, bytes } = filter.memcmp;
            filtered = filtered.filter((a: Entry) => {
              if (a.data.length < offset + bytes.length) return false;
              for (let i = 0; i < bytes.length; i++) {
                if (a.data[offset + i] !== bytes[i]) return false;
              }
              return true;
            });
          }
        }
      }

      return filtered.map((a: Entry) => ({
        publicKey: a.publicKey,
        data: a.data,
        executable: false,
        owner: a.owner,
        lamports: { basisPoints: 1000000n, identifier: 'SOL', decimals: 9 },
      }));
    },
  };

  const eddsa: EddsaInterface = {
    ...createNullEddsa(),
    findPda: (programId: PublicKey, seeds: Uint8Array[]): Pda => {
      // For testing: look up in pdaMap using a deterministic key
      const seedKey = seeds.map((s) => Array.from(s).join(',')).join('|');
      const key = `${programId}:${seedKey}`;
      const result = pdaMap.get(key);
      if (result) {
        return [result, 255] as Pda;
      }
      // Fallback: return a deterministic fake PDA
      const fallback = publicKey(
        new Uint8Array(32).fill(1)
      );
      return [fallback, 255] as Pda;
    },
  };

  return { rpc, eddsa };
}

/**
 * Helper to build the PDA map key for a metadata PDA lookup.
 */
export function metadataPdaKey(mint: PublicKey): string {
  const seeds = [
    new TextEncoder().encode('metadata'),
    publicKeyBytes(TOKEN_METADATA_PROGRAM_ID),
    publicKeyBytes(mint),
  ];
  const seedKey = seeds.map((s) => Array.from(s).join(',')).join('|');
  return `${TOKEN_METADATA_PROGRAM_ID}:${seedKey}`;
}

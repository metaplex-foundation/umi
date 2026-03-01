import { type PublicKey, publicKey } from '@metaplex-foundation/umi';

// --- Program IDs ---

export const TOKEN_METADATA_PROGRAM_ID = publicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);
export const SPL_TOKEN_PROGRAM_ID = publicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

// --- Parsed types ---

export type ParsedCreator = {
  address: PublicKey;
  verified: boolean;
  share: number;
};

export type ParsedMetadata = {
  key: number;
  updateAuthority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: ParsedCreator[] | null;
  primarySaleHappened: boolean;
  isMutable: boolean;
};

export type ParsedMintAccount = {
  mintAuthority: PublicKey | null;
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: PublicKey | null;
};

export type ParsedTokenAccount = {
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
};

// --- Binary reader helper ---

class BinaryReader {
  private offset = 0;

  constructor(private data: Uint8Array) {}

  private view(): DataView {
    return new DataView(
      this.data.buffer,
      this.data.byteOffset,
      this.data.byteLength
    );
  }

  u8(): number {
    const val = this.data[this.offset];
    this.offset += 1;
    return val;
  }

  u16(): number {
    const val = this.view().getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  u32(): number {
    const val = this.view().getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  u64(): bigint {
    const val = this.view().getBigUint64(this.offset, true);
    this.offset += 8;
    return val;
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  publicKey(): PublicKey {
    const bytes = this.data.slice(this.offset, this.offset + 32);
    this.offset += 32;
    return publicKey(bytes);
  }

  /** Borsh string: u32 length prefix + utf8 bytes */
  string(): string {
    const len = this.u32();
    const bytes = this.data.slice(this.offset, this.offset + len);
    this.offset += len;
    return new TextDecoder().decode(bytes).replace(/\0+$/, '');
  }

  /** COption<PublicKey>: u32 tag (0=None,1=Some) + 32 bytes */
  optionPublicKey(): PublicKey | null {
    const tag = this.u32();
    const key = this.publicKey();
    return tag === 1 ? key : null;
  }
}

// --- Parsers ---

/**
 * Parse a Token Metadata program Metadata account.
 *
 * Borsh layout:
 *   key: u8
 *   updateAuthority: [u8; 32]
 *   mint: [u8; 32]
 *   name: String (u32 len + bytes)
 *   symbol: String
 *   uri: String
 *   sellerFeeBasisPoints: u16
 *   creators: Option<Vec<Creator>>
 *     Option tag: bool (1 byte)
 *     Vec prefix: u32 count
 *     Creator: address(32) + verified(1) + share(1) = 34 bytes each
 *   primarySaleHappened: bool
 *   isMutable: bool
 */
export function parseMetadataAccount(data: Uint8Array): ParsedMetadata {
  const reader = new BinaryReader(data);

  const key = reader.u8();
  const updateAuthority = reader.publicKey();
  const mint = reader.publicKey();
  const name = reader.string();
  const symbol = reader.string();
  const uri = reader.string();
  const sellerFeeBasisPoints = reader.u16();

  const hasCreators = reader.bool();
  let creators: ParsedCreator[] | null = null;
  if (hasCreators) {
    const count = reader.u32();
    creators = [];
    for (let i = 0; i < count; i++) {
      creators.push({
        address: reader.publicKey(),
        verified: reader.bool(),
        share: reader.u8(),
      });
    }
  }

  const primarySaleHappened = reader.bool();
  const isMutable = reader.bool();

  return {
    key,
    updateAuthority,
    mint,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    creators,
    primarySaleHappened,
    isMutable,
  };
}

/**
 * Parse an SPL Token Mint account.
 *
 * Layout (fixed, not borsh):
 *   mintAuthority: COption<Pubkey> (4 + 32 = 36 bytes)
 *   supply: u64
 *   decimals: u8
 *   isInitialized: bool (u8)
 *   freezeAuthority: COption<Pubkey> (4 + 32 = 36 bytes)
 *   Total: 82 bytes
 */
export function parseMintAccount(data: Uint8Array): ParsedMintAccount {
  const reader = new BinaryReader(data);

  const mintAuthority = reader.optionPublicKey();
  const supply = reader.u64();
  const decimals = reader.u8();
  const isInitialized = reader.bool();
  const freezeAuthority = reader.optionPublicKey();

  return { mintAuthority, supply, decimals, isInitialized, freezeAuthority };
}

/**
 * Parse an SPL Token Account.
 *
 * Layout (fixed, not borsh):
 *   mint: Pubkey (32 bytes)
 *   owner: Pubkey (32 bytes)
 *   amount: u64 (8 bytes)
 *   ... (remaining fields not needed)
 *   Total: 165 bytes
 */
export function parseTokenAccount(data: Uint8Array): ParsedTokenAccount {
  const reader = new BinaryReader(data);

  const mint = reader.publicKey();
  const owner = reader.publicKey();
  const amount = reader.u64();

  return { mint, owner, amount };
}

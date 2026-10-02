import {
  publicKey,
  PublicKey,
  Signer,
  WrappedInstruction,
} from '@metaplex-foundation/umi';
import { struct, u32, u64 } from '@metaplex-foundation/umi/serializers';

// System Program Transfer: a u32 instruction index of 2, then the lamports as a u64.
export const transferSolInstruction = (
  source: Signer,
  destination: PublicKey,
  lamports: bigint
): WrappedInstruction => ({
  instruction: {
    programId: publicKey('11111111111111111111111111111111'),
    keys: [
      { pubkey: source.publicKey, isSigner: true, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
    ],
    data: struct<{ index: number; lamports: bigint }>([
      ['index', u32()],
      ['lamports', u64()],
    ]).serialize({ index: 2, lamports }),
  },
  signers: [source],
  bytesCreatedOnChain: 0,
});

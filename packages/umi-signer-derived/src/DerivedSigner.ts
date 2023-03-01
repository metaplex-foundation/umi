import {
  Context,
  createSignerFromKeypair,
  isKeypairSigner,
  KeypairSigner,
  Signer,
  utf8,
} from '@metaplex-foundation/umi';
import { sha512 } from '@noble/hashes/sha512';

export type DerivedSigner = KeypairSigner & {
  readonly originalSigner: Signer;
};

export const createDerivedSigner = async (
  context: Pick<Context, 'eddsa'>,
  originalSigner: Signer,
  message: string | Uint8Array
): Promise<DerivedSigner> => {
  const messageBytes =
    typeof message === 'string' ? utf8.serialize(message) : message;
  const signature = await originalSigner.signMessage(messageBytes);
  const seeds = sha512(signature).slice(0, 32);
  const keypair = context.eddsa.createKeypairFromSeed(seeds);

  return {
    ...createSignerFromKeypair(context, keypair),
    originalSigner,
  };
};

export const isDerivedKeypair = (
  signer: Signer & { secretKey?: Uint8Array; originalSigner?: Signer }
): signer is DerivedSigner =>
  signer.originalSigner !== undefined && isKeypairSigner(signer);

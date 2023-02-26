/* eslint-disable import/no-extraneous-dependencies */
import { testPlugins } from '@metaplex-foundation/umi-test';
import {
  base10,
  Context,
  createUmi as baseCreateUmi,
  generateSigner,
  PublicKey,
  publicKey,
  Signer,
  Umi,
  WrappedInstruction,
} from '../src';

export const createUmi = (): Umi => baseCreateUmi().use(testPlugins());

export const transferSol = (
  context: Pick<Context, 'eddsa'>,
  params: {
    from?: Signer;
    to?: PublicKey;
    lamports?: number | bigint;
  } = {}
): WrappedInstruction => {
  const from = params.from ?? generateSigner(context);
  const to = params.to ?? generateSigner(context).publicKey;
  const lamports = BigInt(params.lamports ?? 1_000_000_000);
  const keys = [
    { pubkey: from.publicKey, isSigner: true, isWritable: true },
    { pubkey: to, isSigner: false, isWritable: true },
  ];

  return {
    instruction: {
      programId: publicKey('11111111111111111111111111111111'),
      keys,
      data: base10.serialize(lamports.toString()),
    },
    bytesCreatedOnChain: 0,
    signers: [from],
  };
};

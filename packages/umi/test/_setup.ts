/* eslint-disable import/no-extraneous-dependencies */
import {
  base10,
  Context,
  createUmi as baseCreateUmi,
  generatedSignerIdentity,
  generateSigner,
  PublicKey,
  publicKey,
  Signer,
  Umi,
  WrappedInstruction,
} from '../src';

export const createUmi = (): Umi =>
  baseCreateUmi().use(generatedSignerIdentity());

export const mockInstruction = (): WrappedInstruction => ({
  instruction: {
    programId: publicKey('11111111111111111111111111111111'),
    keys: [
      {
        pubkey: publicKey('LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA'),
        isSigner: false,
        isWritable: true,
      },
    ],
    data: new Uint8Array(),
  },
  bytesCreatedOnChain: 0,
  signers: [],
});

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

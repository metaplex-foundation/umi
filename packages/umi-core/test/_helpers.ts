import {
  Context,
  generateSigner,
  PublicKey,
  publicKey,
  Signer,
  WrappedInstruction,
} from '../src';

export const transferSol = (
  context: Pick<Context, 'eddsa'>,
  params: {
    from: Signer;
    to: PublicKey;
    lamports: number | bigint;
  }
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
      data: new Uint8Array(Number(lamports)), // TODO
    },
    bytesCreatedOnChain: 0,
    signers: [from],
  };
};

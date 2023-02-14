import { createSignerFromKeypair, generateSigner, Keypair } from './Keypair';
import type { UmiPlugin } from './UmiPlugin';
import type { Signer } from './Signer';

export const signerIdentity = (signer: Signer, setPayer = true): UmiPlugin => ({
  install(umi) {
    umi.identity = signer;
    if (setPayer) {
      umi.payer = signer;
    }
  },
});

export const signerPayer = (signer: Signer): UmiPlugin => ({
  install(umi) {
    umi.payer = signer;
  },
});

export const generatedSignerIdentity = (setPayer = true): UmiPlugin => ({
  install(umi) {
    const signer = generateSigner(umi);
    umi.use(signerIdentity(signer, setPayer));
  },
});

export const generatedSignerPayer = (): UmiPlugin => ({
  install(umi) {
    const signer = generateSigner(umi);
    umi.use(signerPayer(signer));
  },
});

export const keypairIdentity = (
  keypair: Keypair,
  setPayer = true
): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer, setPayer));
  },
});

export const keypairPayer = (keypair: Keypair): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerPayer(signer));
  },
});

import { createSignerFromKeypair, generateSigner, Keypair } from './Keypair';
import type { MetaplexPlugin } from './MetaplexPlugin';
import type { Signer } from './Signer';

export const signerIdentity = (
  signer: Signer,
  setPayer = true
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.identity = signer;
    if (setPayer) {
      metaplex.payer = signer;
    }
  },
});

export const signerPayer = (signer: Signer): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.payer = signer;
  },
});

export const generatedSignerIdentity = (setPayer = true): MetaplexPlugin => ({
  install(metaplex) {
    const signer = generateSigner(metaplex);
    metaplex.use(signerIdentity(signer, setPayer));
  },
});

export const generatedSignerPayer = (): MetaplexPlugin => ({
  install(metaplex) {
    const signer = generateSigner(metaplex);
    metaplex.use(signerPayer(signer));
  },
});

export const keypairIdentity = (
  keypair: Keypair,
  setPayer = true
): MetaplexPlugin => ({
  install(metaplex) {
    const signer = createSignerFromKeypair(metaplex, keypair);
    metaplex.use(signerIdentity(signer, setPayer));
  },
});

export const keypairPayer = (keypair: Keypair): MetaplexPlugin => ({
  install(metaplex) {
    const signer = createSignerFromKeypair(metaplex, keypair);
    metaplex.use(signerPayer(signer));
  },
});

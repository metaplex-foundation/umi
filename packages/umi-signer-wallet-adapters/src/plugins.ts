import {
  MetaplexPlugin,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi-core';
import {
  createSignerFromWalletAdapter,
  WalletAdapter,
} from './createSignerFromWalletAdapter';

export const walletAdapterIdentity = (
  walletAdapter: WalletAdapter,
  setPayer = true
): MetaplexPlugin => ({
  install(metaplex) {
    const signer = createSignerFromWalletAdapter(walletAdapter);
    metaplex.use(signerIdentity(signer, setPayer));
  },
});

export const walletAdapterPayer = (
  walletAdapter: WalletAdapter
): MetaplexPlugin => ({
  install(metaplex) {
    const signer = createSignerFromWalletAdapter(walletAdapter);
    metaplex.use(signerPayer(signer));
  },
});

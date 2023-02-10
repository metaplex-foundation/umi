import {
  MetaplexPlugin,
  signerIdentity,
  signerPayer,
} from '@lorisleiva/js-core';
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

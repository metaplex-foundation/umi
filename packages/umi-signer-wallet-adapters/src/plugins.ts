import {
  UmiPlugin,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi';
import {
  createSignerFromWalletAdapter,
  WalletAdapter,
} from './createSignerFromWalletAdapter';

export const walletAdapterIdentity = (
  walletAdapter: WalletAdapter,
  setPayer = true
): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromWalletAdapter(walletAdapter);
    umi.use(signerIdentity(signer, setPayer));
  },
});

export const walletAdapterPayer = (
  walletAdapter: WalletAdapter
): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromWalletAdapter(walletAdapter);
    umi.use(signerPayer(signer));
  },
});

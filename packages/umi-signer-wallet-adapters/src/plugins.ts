import {
  UmiPlugin,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi';
import { Connection as Web3JsConnection } from '@solana/web3.js';
import {
  createSignerFromWalletAdapter,
  WalletAdapter,
} from './createSignerFromWalletAdapter';

/**
 * @param connection A `Connection` to submit through. Only required to use
 * `signer.signAndSendTransaction`; every other capability works without it.
 */
export const walletAdapterIdentity = (
  walletAdapter: WalletAdapter,
  setPayer = true,
  connection?: Web3JsConnection
): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromWalletAdapter(walletAdapter, connection);
    umi.use(signerIdentity(signer, setPayer));
  },
});

/**
 * @param connection A `Connection` to submit through. Only required to use
 * `signer.signAndSendTransaction`; every other capability works without it.
 */
export const walletAdapterPayer = (
  walletAdapter: WalletAdapter,
  connection?: Web3JsConnection
): UmiPlugin => ({
  install(umi) {
    const signer = createSignerFromWalletAdapter(walletAdapter, connection);
    umi.use(signerPayer(signer));
  },
});

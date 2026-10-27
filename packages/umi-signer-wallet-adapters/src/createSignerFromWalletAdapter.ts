import type {
  PublicKey,
  Signer,
  Transaction,
  TransactionSignature,
} from '@metaplex-foundation/umi';
// eslint-disable-next-line no-restricted-imports -- `@metaplex-foundation/umi/serializers` can't be
// resolved by some bundlers/older Jest (see #175); importing the deprecated re-export from the
// package root avoids the same failure here.
import { base58 } from '@metaplex-foundation/umi';
import {
  Connection as Web3JsConnection,
  PublicKey as Web3JsPublicKey,
  SendOptions as Web3JsSendOptions,
  Transaction as Web3JsTransaction,
  VersionedTransaction as Web3JsVersionedTransaction,
} from '@solana/web3.js';
import {
  fromWeb3JsPublicKey,
  fromWeb3JsTransaction,
  toWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  OperationNotSupportedByWalletAdapterError,
  UninitializedWalletAdapterError,
} from './errors';

type Web3JsTransactionOrVersionedTransaction =
  | Web3JsTransaction
  | Web3JsVersionedTransaction;

export type WalletAdapter = {
  publicKey: Web3JsPublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction?: <T extends Web3JsTransactionOrVersionedTransaction>(
    transaction: T
  ) => Promise<T>;
  signAllTransactions?: <T extends Web3JsTransactionOrVersionedTransaction>(
    transactions: T[]
  ) => Promise<T[]>;
  /**
   * The long-standing Wallet Adapter capability (predating the Wallet
   * Standard's `signAndSendTransaction`) that lets a connected wallet sign
   * and submit a transaction in a single prompt. Requires a `Connection` to
   * submit through, passed separately to `createSignerFromWalletAdapter`.
   */
  sendTransaction?: (
    transaction: Web3JsTransactionOrVersionedTransaction,
    connection: Web3JsConnection,
    options?: Web3JsSendOptions
  ) => Promise<string>;
};

/**
 * @param walletAdapter The wallet adapter to wrap in a Umi `Signer`.
 * @param connection A `Connection` to submit through. Only required to use
 * `signer.signAndSendTransaction`; every other capability works without it.
 */
export const createSignerFromWalletAdapter = (
  walletAdapter: WalletAdapter,
  connection?: Web3JsConnection
): Signer => ({
  get publicKey(): PublicKey {
    if (!walletAdapter.publicKey) {
      throw new UninitializedWalletAdapterError();
    }

    return fromWeb3JsPublicKey(walletAdapter.publicKey);
  },

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (walletAdapter.signMessage === undefined) {
      throw new OperationNotSupportedByWalletAdapterError('signMessage');
    }

    return walletAdapter.signMessage(message);
  },

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (walletAdapter.signTransaction === undefined) {
      throw new OperationNotSupportedByWalletAdapterError('signTransaction');
    }

    return fromWeb3JsTransaction(
      await walletAdapter.signTransaction(toWeb3JsTransaction(transaction))
    );
  },

  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (walletAdapter.signAllTransactions === undefined) {
      throw new OperationNotSupportedByWalletAdapterError(
        'signAllTransactions'
      );
    }

    const web3JsTransactions = transactions.map(toWeb3JsTransaction);
    const signedTransactions = await walletAdapter.signAllTransactions(
      web3JsTransactions
    );

    return signedTransactions.map(fromWeb3JsTransaction);
  },

  async signAndSendTransaction(
    transaction: Transaction
  ): Promise<TransactionSignature> {
    if (walletAdapter.sendTransaction === undefined || connection === undefined) {
      throw new OperationNotSupportedByWalletAdapterError(
        'signAndSendTransaction'
      );
    }

    const signature = await walletAdapter.sendTransaction(
      toWeb3JsTransaction(transaction),
      connection
    );

    return base58.serialize(signature);
  },
});

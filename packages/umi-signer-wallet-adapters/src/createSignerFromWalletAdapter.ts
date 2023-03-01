import type { PublicKey, Signer, Transaction } from '@metaplex-foundation/umi';
import {
  PublicKey as Web3JsPublicKey,
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
};

export const createSignerFromWalletAdapter = (
  walletAdapter: WalletAdapter
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
});

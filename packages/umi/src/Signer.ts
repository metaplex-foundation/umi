import { PublicKey, samePublicKey } from './PublicKey';
import { Transaction } from './Transaction';
import { uniqueBy } from './utils';

/**
 * Defines a public key that can sign transactions and messages.
 * @category Context and Interfaces
 */
export interface Signer {
  /** The public key of the Signer. */
  publicKey: PublicKey;
  /** Signs the given message. */
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  /** Signs the given transaction. */
  signTransaction(transaction: Transaction): Promise<Transaction>;
  /** Signs all the given transactions at once. */
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

/**
 * Signs a transaction using the provided signers.
 * @category Signers and PublicKeys
 */
export const signTransaction = async (
  transaction: Transaction,
  signers: Signer[]
): Promise<Transaction> =>
  signers.reduce(async (promise, signer) => {
    const unsigned = await promise;
    return signer.signTransaction(unsigned);
  }, Promise.resolve(transaction));

/**
 * Signs multiple transactions using the provided signers
 * such that signers that need to sign multiple transactions
 * sign them all at once using the `signAllTransactions` method.
 *
 * @category Signers and PublicKeys
 */
export const signAllTransactions = async (
  transactionsWithSigners: {
    transaction: Transaction;
    signers: Signer[];
  }[]
): Promise<Transaction[]> => {
  const transactions = transactionsWithSigners.map((item) => item.transaction);
  const signersWithTransactions = transactionsWithSigners.reduce(
    (all, { signers }, index) => {
      signers.forEach((signer) => {
        const item = all.find((item) =>
          samePublicKey(item.signer.publicKey, signer.publicKey)
        );
        if (item) {
          item.indices.push(index);
        } else {
          all.push({ signer, indices: [index] });
        }
      });
      return all;
    },
    [] as { signer: Signer; indices: number[] }[]
  );

  return signersWithTransactions.reduce(
    async (promise, { signer, indices }) => {
      const transactions = await promise;
      if (indices.length === 1) {
        const unsigned = transactions[indices[0]];
        transactions[indices[0]] = await signer.signTransaction(unsigned);
        return transactions;
      }
      const unsigned = indices.map((index) => transactions[index]);
      const signed = await signer.signAllTransactions(unsigned);
      indices.forEach((index, position) => {
        transactions[index] = signed[position];
      });
      return transactions;
    },
    Promise.resolve(transactions)
  );
};

/**
 * Whether the provided value is a `Signer`.
 * @category Signers and PublicKeys
 */
export const isSigner = (value: PublicKey | Signer): value is Signer =>
  'publicKey' in value;

/**
 * Deduplicates the provided signers by public key.
 * @category Signers and PublicKeys
 */
export const uniqueSigners = (signers: Signer[]): Signer[] =>
  uniqueBy(signers, samePublicKey);

/**
 * Creates a `Signer` that, when required to sign, does nothing.
 * This can be useful when libraries require a `Signer` but
 * we don't have one in the current environment. For example,
 * if the transaction will then be signed in a backend server.
 *
 * @category Signers and PublicKeys
 */
export const createNoopSigner = (publicKey: PublicKey): Signer => ({
  publicKey,
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return message;
  },
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    return transaction;
  },
  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    return transactions;
  },
});

/**
 * Creates a `Signer` that, when required to sign, throws an error.
 * @category Signers and PublicKeys
 */
export const createNullSigner = (): Signer => new NullSigner();

/**
 * Creates a `Signer` that, when required to sign, throws an error.
 * @category Signers and PublicKeys
 */
export class NullSigner implements Signer {
  // TODO(loris): Custom errors.
  get publicKey(): PublicKey {
    throw new Error('Method not implemented.');
  }

  signMessage(): Promise<Uint8Array> {
    throw new Error('Method not implemented.');
  }

  signTransaction(): Promise<Transaction> {
    throw new Error('Method not implemented.');
  }

  signAllTransactions(): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
}

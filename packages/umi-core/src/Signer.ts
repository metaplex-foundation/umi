import { PublicKey, samePublicKey } from './PublicKey';
import { Transaction } from './Transaction';
import { uniqueBy } from './utils';

export type Signer = {
  publicKey: PublicKey;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
};

export const signTransaction = async (
  transaction: Transaction,
  signers: Signer[]
): Promise<Transaction> =>
  signers.reduce(async (promise, signer) => {
    const unsigned = await promise;
    return signer.signTransaction(unsigned);
  }, Promise.resolve(transaction));

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

export const isSigner = (value: PublicKey | Signer): value is Signer =>
  'publicKey' in value;

export const uniqueSigners = (signers: Signer[]): Signer[] =>
  uniqueBy(signers, samePublicKey);

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

export const createNullSigner = (): Signer => new NullSigner();

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

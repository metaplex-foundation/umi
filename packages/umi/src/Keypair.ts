import type { Context } from './Context';
import type { PublicKey } from './PublicKey';
import type { Signer } from './Signer';
import { addTransactionSignature, Transaction } from './Transaction';

/**
 * Represents a keypair with a public key and a secret key.
 * @category Interfaces — Signer
 */
export type Keypair = {
  publicKey: PublicKey;
  secretKey: Uint8Array;
};

/**
 * Represent a {@link Signer} that can is aware of its secret key.
 * @category Interfaces — Signer
 */
export type KeypairSigner = Signer & Keypair;

/**
 * Generate a new random {@link KeypairSigner} using the Eddsa interface.
 * @category Interfaces — Signer
 */
export const generateSigner = (
  context: Pick<Context, 'eddsa'>
): KeypairSigner =>
  createSignerFromKeypair(context, context.eddsa.generateKeypair());

/**
 * Creates a {@link KeypairSigner} from a {@link Keypair} object.
 * @category Interfaces — Signer
 */
export const createSignerFromKeypair = (
  context: Pick<Context, 'eddsa'>,
  keypair: Keypair
): KeypairSigner => ({
  publicKey: keypair.publicKey,
  secretKey: keypair.secretKey,
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return context.eddsa.sign(message, keypair);
  },
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const message = transaction.serializedMessage;
    const signature = context.eddsa.sign(message, keypair);
    return addTransactionSignature(transaction, signature, keypair.publicKey);
  },
  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    return Promise.all(
      transactions.map((transaction) => this.signTransaction(transaction))
    );
  },
});

/**
 * Whether the given signer is a {@link KeypairSigner}.
 * @category Interfaces — Signer
 */
export const isKeypairSigner = (
  signer: Signer & { secretKey?: Uint8Array }
): signer is KeypairSigner => signer.secretKey !== undefined;

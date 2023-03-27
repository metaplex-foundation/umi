import { InterfaceImplementationMissingError } from './errors';
import type {
  SerializedTransaction,
  SerializedTransactionMessage,
  Transaction,
  TransactionInput,
  TransactionMessage,
} from './Transaction';

/**
 * Defines the interface for a transaction factory.
 * It allows us to create, serialize and deserialize transactions and their messages.
 *
 * @category Context and Interfaces
 */
export interface TransactionFactoryInterface {
  /** Creates a new transaction from a given input. */
  create(input: TransactionInput): Transaction;
  /** Serializes a transaction. */
  serialize(transaction: Transaction): SerializedTransaction;
  /** Deserializes a transaction. */
  deserialize(serializedTransaction: SerializedTransaction): Transaction;
  /** Serializes a transaction message. */
  serializeMessage(message: TransactionMessage): SerializedTransactionMessage;
  /** Deserializes a transaction message. */
  deserializeMessage(
    serializedMessage: SerializedTransactionMessage
  ): TransactionMessage;
}

/**
 * An implementation of the {@link TransactionFactoryInterface} that throws an error when called.
 * @category Transactions
 */
export class NullTransactionFactory implements TransactionFactoryInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'TransactionFactoryInterface',
    'transactions'
  );

  create(): Transaction {
    throw this.error;
  }

  serialize(): SerializedTransaction {
    throw this.error;
  }

  deserialize(): Transaction {
    throw this.error;
  }

  serializeMessage(): SerializedTransactionMessage {
    throw this.error;
  }

  deserializeMessage(): TransactionMessage {
    throw this.error;
  }
}

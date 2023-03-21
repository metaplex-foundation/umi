import { InterfaceImplementationMissingError } from './errors';
import type {
  SerializedTransaction,
  SerializedTransactionMessage,
  Transaction,
  TransactionInput,
  TransactionMessage,
} from './Transaction';

/**
 * TODO
 *
 * @category Interfaces
 */
export interface TransactionFactoryInterface {
  create(input: TransactionInput): Transaction;
  serialize(transaction: Transaction): SerializedTransaction;
  deserialize(serializedTransaction: SerializedTransaction): Transaction;
  serializeMessage(message: TransactionMessage): SerializedTransactionMessage;
  deserializeMessage(
    serializedMessage: SerializedTransactionMessage
  ): TransactionMessage;
}

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

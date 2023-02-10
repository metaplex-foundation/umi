import {
  SerializedTransaction,
  SerializedTransactionMessage,
  Transaction,
  TransactionFactoryInterface,
  TransactionInput,
  TransactionMessage,
} from '@metaplex-foundation/umi-core';
import {
  fromWeb3JsMessage,
  fromWeb3JsTransaction,
  toWeb3JsMessage,
  toWeb3JsMessageFromInput,
  toWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  VersionedTransaction as Web3JsTransaction,
  VersionedMessage as Web3JsMessage,
} from '@solana/web3.js';

export class Web3JsTransactionFactory implements TransactionFactoryInterface {
  create(input: TransactionInput): Transaction {
    const web3JsMessage = toWeb3JsMessageFromInput(input);
    const web3JsTransaction = new Web3JsTransaction(
      web3JsMessage,
      input.signatures
    );
    return {
      message: fromWeb3JsMessage(web3JsMessage),
      serializedMessage: web3JsMessage.serialize(),
      signatures: web3JsTransaction.signatures,
    };
  }

  serialize(transaction: Transaction): SerializedTransaction {
    return toWeb3JsTransaction(transaction).serialize();
  }

  deserialize(serializedTransaction: SerializedTransaction): Transaction {
    return fromWeb3JsTransaction(
      Web3JsTransaction.deserialize(serializedTransaction)
    );
  }

  serializeMessage(message: TransactionMessage): SerializedTransactionMessage {
    return new Uint8Array(toWeb3JsMessage(message).serialize());
  }

  deserializeMessage(
    serializedMessage: SerializedTransactionMessage
  ): TransactionMessage {
    return fromWeb3JsMessage(Web3JsMessage.deserialize(serializedMessage));
  }
}

import {
  getTransactionMessageSerializer,
  getTransactionSerializer,
  SerializedTransaction,
  SerializedTransactionMessage,
  Transaction,
  TransactionFactoryInterface,
  TransactionInput,
  TransactionMessage,
  TransactionVersion,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsMessage,
  toWeb3JsMessageFromInput,
} from '@metaplex-foundation/umi-web3js-adapters';
import { VersionedTransaction as Web3JsTransaction } from '@solana/web3.js';

export type Web3JsTransactionFactoryOptions = {
  /**
   * The version `TransactionBuilder` builds when none was set on it.
   * Defaults to V0. `umi.transactions.create()` is unaffected.
   */
  defaultTransactionVersion?: TransactionVersion;
};

export function createWeb3JsTransactionFactory(
  options: Web3JsTransactionFactoryOptions = {}
): TransactionFactoryInterface {
  const create = (input: TransactionInput): Transaction => {
    // @solana/web3.js models the V1 compute budget with JS numbers, which
    // cannot hold a u64 priority fee. Compile the accounts without it and
    // keep the caller's exact config on the Umi message instead.
    const web3JsMessage = toWeb3JsMessageFromInput(
      input.version === 1 ? { ...input, transactionConfig: undefined } : input
    );
    let message = fromWeb3JsMessage(web3JsMessage);
    if (input.version === 1) {
      message = {
        ...message,
        transactionConfig: input.transactionConfig ?? {},
      };
    }
    const web3JsTransaction = new Web3JsTransaction(
      web3JsMessage,
      input.signatures
    );
    return {
      message,
      serializedMessage: serializeMessage(message),
      signatures: web3JsTransaction.signatures,
    };
  };

  const serialize = (transaction: Transaction): SerializedTransaction =>
    getTransactionSerializer().serialize(transaction);

  const deserialize = (
    serializedTransaction: SerializedTransaction
  ): Transaction =>
    getTransactionSerializer().deserialize(serializedTransaction)[0];

  const serializeMessage = (
    message: TransactionMessage
  ): SerializedTransactionMessage =>
    getTransactionMessageSerializer().serialize(message);

  const deserializeMessage = (
    serializedMessage: SerializedTransactionMessage
  ): TransactionMessage =>
    getTransactionMessageSerializer().deserialize(serializedMessage)[0];

  return {
    create,
    serialize,
    deserialize,
    serializeMessage,
    deserializeMessage,
    getDefaultVersion: () => options.defaultTransactionVersion ?? 0,
  };
}

import {
  getTransactionV1MessageSerializer,
  getTransactionV1Serializer,
  Transaction,
} from '@metaplex-foundation/umi';
import { VersionedTransaction } from '@solana/web3.js';
import test from 'ava';
import { fromWeb3JsTransaction, toWeb3JsTransaction } from '../src';
import { V1_MESSAGE } from './TransactionMessage.test';

const V1_TRANSACTION: Transaction = {
  message: V1_MESSAGE,
  serializedMessage: getTransactionV1MessageSerializer().serialize(V1_MESSAGE),
  signatures: [new Uint8Array(64).fill(7)],
};

test('it can convert a V1 transaction to a serializable web3.js transaction', (t) => {
  const web3JsTransaction = toWeb3JsTransaction(V1_TRANSACTION);
  t.is(web3JsTransaction.message.version, 1);
  t.deepEqual(
    web3JsTransaction.serialize(),
    getTransactionV1Serializer().serialize(V1_TRANSACTION)
  );
});

test('it can convert a V1 transaction parsed by web3.js', (t) => {
  // web3.js can parse V1 transactions but not serialize them, Umi can.
  const serialized = getTransactionV1Serializer().serialize(V1_TRANSACTION);
  const web3JsTransaction = VersionedTransaction.deserialize(serialized);
  t.deepEqual(fromWeb3JsTransaction(web3JsTransaction), V1_TRANSACTION);
});

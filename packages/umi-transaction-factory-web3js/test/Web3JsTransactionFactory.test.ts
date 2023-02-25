import test from 'ava';
import {
  createLegacyMessage,
  createOversizedTransaction,
  createUmi,
  createV0Message,
  createV0Transaction,
} from './_setup';

test('it can serialize a legacy message', async (t) => {
  const umi = createUmi();
  const [legacyMessage, web3JsLegacyMessage] = createLegacyMessage(umi);
  const serialized = umi.transactions.serializeMessage(legacyMessage);
  t.deepEqual(serialized, new Uint8Array(web3JsLegacyMessage.serialize()));
});

test('it can deserialize a legacy message', async (t) => {
  const umi = createUmi();
  const [originalMessage, web3JsLegacyMessage] = createLegacyMessage(umi);
  const serializedMessage = new Uint8Array(web3JsLegacyMessage.serialize());
  const deserializedMessage =
    umi.transactions.deserializeMessage(serializedMessage);
  t.deepEqual(deserializedMessage, originalMessage);
});

test('it can serialize a V0 message', async (t) => {
  const umi = createUmi();
  const [v0Message, web3JsV0Message] = createV0Message(umi);
  const serialized = umi.transactions.serializeMessage(v0Message);
  t.deepEqual(serialized, web3JsV0Message.serialize());
});

test('it can deserialize a V0 message', async (t) => {
  const umi = createUmi();
  const [originalMessage, web3JsV0Message] = createV0Message(umi);
  const serializedMessage = web3JsV0Message.serialize();
  const deserializedMessage =
    umi.transactions.deserializeMessage(serializedMessage);
  t.deepEqual(deserializedMessage, originalMessage);
});

test('it can serialize a transaction', async (t) => {
  const umi = createUmi();
  const [transaction, web3JsTransaction] = createV0Transaction(umi);
  const serialized = umi.transactions.serialize(transaction);
  t.deepEqual(serialized, web3JsTransaction.serialize());
});

test('it can deserialize a transaction', async (t) => {
  const umi = createUmi();
  const [originalTransaction, web3JsTransaction] = createV0Transaction(umi);
  const serializedTransaction = web3JsTransaction.serialize();
  const deserializedTransaction = umi.transactions.deserialize(
    serializedTransaction
  );
  t.deepEqual(deserializedTransaction, originalTransaction);
});

test('it can serialize an oversized transaction', async (t) => {
  const umi = createUmi();
  const [transaction] = createOversizedTransaction(umi);
  const transactionSize = umi.transactions.serialize(transaction).length;
  t.is(transactionSize, 14669);
});

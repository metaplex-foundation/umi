import { createBaseUmi, lamports } from '@metaplex-foundation/umi';
import { base64 } from '@metaplex-foundation/umi/serializers';
import test from 'ava';
import { web3JsTransactionFactory } from '../src';
import { V1_LARGE_TRANSACTION_BASE64 } from './_fixtures';
import {
  createLegacyMessage,
  createOversizedTransaction,
  createTransferInstruction,
  createUmi,
  createV0Message,
  createV0Transaction,
  createV1Transaction,
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

test('it can deserialize a V1 transaction larger than the legacy size limit', async (t) => {
  const umi = createUmi();
  const serialized = base64.serialize(V1_LARGE_TRANSACTION_BASE64);
  t.is(serialized.length, 3976);
  const transaction = umi.transactions.deserialize(serialized);
  t.is(transaction.message.version, 1);
  t.deepEqual(transaction.message.transactionConfig, {
    priorityFee: lamports(123_456_789),
    computeUnitLimit: 1_400_000,
    loadedAccountsDataSizeLimit: 65_536,
    heapSize: 65_536,
  });
  t.is(transaction.message.accounts.length, 4);
  t.is(transaction.message.instructions.length, 2);
  t.is(transaction.message.instructions[1].programIndex, 3);
  t.deepEqual(
    transaction.message.instructions[1].data,
    new Uint8Array(Array.from({ length: 3700 }, (_, i) => i % 251))
  );
  t.true(
    umi.eddsa.verify(
      transaction.serializedMessage,
      transaction.signatures[0],
      transaction.message.accounts[0]
    )
  );
  t.deepEqual(umi.transactions.serialize(transaction), serialized);
});

test('it can create a V1 transaction', async (t) => {
  const umi = createUmi();
  const [transaction, signers] = await createV1Transaction(umi);
  t.is(transaction.message.version, 1);
  t.deepEqual(transaction.message.transactionConfig, {
    computeUnitLimit: 30_000,
    loadedAccountsDataSizeLimit: 200_000,
    priorityFee: lamports(5_000),
  });
  t.is(transaction.signatures.length, signers.length);
  transaction.signatures.forEach((signature, index) => {
    t.true(
      umi.eddsa.verify(
        transaction.serializedMessage,
        signature,
        transaction.message.accounts[index]
      )
    );
  });
  t.deepEqual(
    umi.transactions.deserializeMessage(transaction.serializedMessage),
    transaction.message
  );
  const serialized = umi.transactions.serialize(transaction);
  t.is(serialized[0], 0x81);
  t.deepEqual(umi.transactions.deserialize(serialized), transaction);
});

test('it keeps V1 priority fees above 2^53 lamports exact', async (t) => {
  const umi = createUmi();
  const [instruction, , [payer]] = createTransferInstruction(umi);
  const priorityFee = lamports(2n ** 60n + 5n);
  const transaction = umi.transactions.create({
    version: 1,
    payer: payer.publicKey,
    instructions: [instruction],
    blockhash: '11111111111111111111111111111111',
    transactionConfig: { computeUnitLimit: 1, priorityFee },
  });
  t.deepEqual(transaction.message.transactionConfig?.priorityFee, priorityFee);
  const roundTrip = umi.transactions.deserialize(
    umi.transactions.serialize(transaction)
  );
  t.deepEqual(roundTrip.message.transactionConfig?.priorityFee, priorityFee);
});

test('it can set the default version that transaction builders use', (t) => {
  const withDefault = createBaseUmi().use(
    web3JsTransactionFactory({ defaultTransactionVersion: 1 })
  );
  t.is(withDefault.transactions.getDefaultVersion(), 1);

  const withoutDefault = createBaseUmi().use(web3JsTransactionFactory());
  t.is(withoutDefault.transactions.getDefaultVersion(), 0);
});

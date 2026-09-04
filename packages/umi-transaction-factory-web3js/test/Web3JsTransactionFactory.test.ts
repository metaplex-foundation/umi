import {
  generateSigner,
  lamports,
  publicKey,
  transactionBuilder,
  TransactionMessage,
} from '@metaplex-foundation/umi';
import { base64 } from '@metaplex-foundation/umi/serializers';
import test from 'ava';
import {
  V1_LARGE_TRANSACTION_BASE64,
  V1_TRANSACTION_BASE64,
} from './_fixtures';
import {
  createLegacyMessage,
  createOversizedTransaction,
  createUmi,
  createV0Message,
  createV0Transaction,
  createV1Transaction,
} from './_setup';

/** The message of {@link V1_TRANSACTION_BASE64}. */
const V1_MESSAGE: TransactionMessage = {
  version: 1,
  header: {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 1,
  },
  accounts: [
    publicKey('GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB'),
    publicKey('J2xccRtuG43drESLYznHhLhQkLTdfepcKYbiQ9BsJVaf'),
    publicKey('11111111111111111111111111111111'),
  ],
  blockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
  instructions: [
    {
      programIndex: 2,
      accountIndexes: [0, 1],
      data: new Uint8Array([2, 0, 0, 0, 64, 66, 15, 0, 0, 0, 0, 0]),
    },
  ],
  addressLookupTables: [],
  transactionConfig: {
    priorityFee: lamports(5_000),
    computeUnitLimit: 30_000,
    loadedAccountsDataSizeLimit: 200_000,
  },
};

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

test('it can deserialize a V1 message', async (t) => {
  const umi = createUmi();
  const serializedMessage = base64
    .serialize(V1_TRANSACTION_BASE64)
    .slice(0, -64);
  t.deepEqual(
    umi.transactions.deserializeMessage(serializedMessage),
    V1_MESSAGE
  );
});

test('it can deserialize and serialize a V1 transaction', async (t) => {
  const umi = createUmi();
  const serialized = base64.serialize(V1_TRANSACTION_BASE64);
  const transaction = umi.transactions.deserialize(serialized);
  t.deepEqual(transaction.message, V1_MESSAGE);
  t.deepEqual(transaction.serializedMessage, serialized.slice(0, -64));
  t.deepEqual(transaction.signatures, [serialized.slice(-64)]);
  t.true(
    umi.eddsa.verify(
      transaction.serializedMessage,
      transaction.signatures[0],
      transaction.message.accounts[0]
    )
  );
  t.deepEqual(umi.transactions.serialize(transaction), serialized);
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
  t.deepEqual(transaction.message.addressLookupTables, []);
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
  const serialized = umi.transactions.serialize(transaction);
  t.is(serialized[0], 0x81);
  t.deepEqual(umi.transactions.deserialize(serialized), transaction);
});

test('it can fit more in a V1 transaction than in a V0 transaction', async (t) => {
  const umi = createUmi();
  const builder = transactionBuilder()
    .setFeePayer(generateSigner(umi))
    .add({
      instruction: {
        programId: publicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        keys: [],
        data: new Uint8Array(3000),
      },
      signers: [],
      bytesCreatedOnChain: 0,
    });
  t.is(builder.useV0().minimumTransactionsRequired(umi), 3);
  t.false(builder.useV0().fitsInOneTransaction(umi));
  t.is(builder.useV1().minimumTransactionsRequired(umi), 1);
  t.true(builder.useV1().fitsInOneTransaction(umi));
});

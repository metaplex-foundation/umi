import {
  getTransactionV1MessageSerializer,
  getTransactionV1Serializer,
  lamports,
  publicKey,
  Transaction,
  TransactionMessage,
} from '@metaplex-foundation/umi';
import {
  MessageV1,
  PublicKey as Web3JsPublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import test from 'ava';
import {
  fromWeb3JsMessage,
  fromWeb3JsTransaction,
  SerializableMessageV1,
  toWeb3JsMessage,
  toWeb3JsTransaction,
} from '../src';

const V1_WEB3JS_MESSAGE = new MessageV1({
  header: {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 1,
  },
  staticAccountKeys: [
    new Web3JsPublicKey('GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB'),
    new Web3JsPublicKey('11111111111111111111111111111111'),
  ],
  recentBlockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
  compiledInstructions: [
    { programIdIndex: 1, accountKeyIndexes: [0], data: new Uint8Array([1, 2]) },
  ],
  transactionConfig: {
    computeUnitLimit: 30_000,
    heapSize: null,
    loadedAccountsDataSizeLimit: null,
    priorityFee: 5_000,
  },
});

const V1_MESSAGE: TransactionMessage = {
  version: 1,
  header: {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 1,
  },
  accounts: [
    publicKey('GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB'),
    publicKey('11111111111111111111111111111111'),
  ],
  blockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
  instructions: [
    { programIndex: 1, accountIndexes: [0], data: new Uint8Array([1, 2]) },
  ],
  addressLookupTables: [],
  transactionConfig: { priorityFee: lamports(5_000), computeUnitLimit: 30_000 },
};

const V1_TRANSACTION: Transaction = {
  message: V1_MESSAGE,
  serializedMessage: getTransactionV1MessageSerializer().serialize(V1_MESSAGE),
  signatures: [new Uint8Array(64).fill(7)],
};

test('it can convert a V1 message from web3.js', (t) => {
  t.deepEqual(fromWeb3JsMessage(V1_WEB3JS_MESSAGE), V1_MESSAGE);
});

test('it can convert a V1 message to a serializable web3.js message', (t) => {
  const web3JsMessage = toWeb3JsMessage(V1_MESSAGE);
  t.true(web3JsMessage instanceof SerializableMessageV1);
  t.deepEqual(fromWeb3JsMessage(web3JsMessage), V1_MESSAGE);
  t.deepEqual(web3JsMessage.serialize(), V1_TRANSACTION.serializedMessage);
});

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

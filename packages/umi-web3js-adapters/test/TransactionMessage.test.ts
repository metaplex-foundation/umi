import {
  getTransactionV1MessageSerializer,
  lamports,
  publicKey,
  TransactionMessage,
} from '@metaplex-foundation/umi';
import { MessageV1, PublicKey as Web3JsPublicKey } from '@solana/web3.js';
import test from 'ava';
import {
  fromWeb3JsMessage,
  SerializableMessageV1,
  toWeb3JsMessage,
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

export const V1_MESSAGE: TransactionMessage = {
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

test('it can convert a V1 message from web3.js', (t) => {
  t.deepEqual(fromWeb3JsMessage(V1_WEB3JS_MESSAGE), V1_MESSAGE);
});

test('it can convert a V1 message to a serializable web3.js message', (t) => {
  const web3JsMessage = toWeb3JsMessage(V1_MESSAGE);
  t.true(web3JsMessage instanceof MessageV1);
  t.true(web3JsMessage instanceof SerializableMessageV1);
  t.deepEqual(fromWeb3JsMessage(web3JsMessage), V1_MESSAGE);
  t.deepEqual(
    web3JsMessage.serialize(),
    getTransactionV1MessageSerializer().serialize(V1_MESSAGE)
  );
});

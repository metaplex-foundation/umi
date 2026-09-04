import test from 'ava';
import {
  getTransactionV1MessageSerializer,
  getTransactionV1Serializer,
  lamports,
  publicKey,
  TransactionMessage,
} from '../src';
import { base64 } from '../src/serializers';

// A V1 transaction test vector borrowed from @solana/web3.js.
const V1_TRANSACTION = base64.serialize(
  [
    'gQEAAQ8AAADomUshQUu++wfzaydJlLMCXvZqJHDIekamPKt/+nouRQED6kpsY+Kc',
    'Ugq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iz9FyQ4WqDHW2T7eM1gL6HZkf3r92sT',
    'xY7XAurINen2GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiBMAAAAA',
    'AAAwdQAAQA0DAAICDAAAAQIAAABAQg8AAAAAAE+PfvytpVg+OwZUsJfh3nrH0Wuu',
    'O9+NStlru2gn0ecx/F/h7BAGXmEWVFVXsjzEsQxk0VLc9Pi0kJaLLOJp4wE=',
  ].join('')
);
const V1_SERIALIZED_MESSAGE = V1_TRANSACTION.slice(0, -64);
const V1_SIGNATURE = V1_TRANSACTION.slice(-64);
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

test('it can serialize and deserialize V1 messages', (t) => {
  const serializer = getTransactionV1MessageSerializer();
  t.deepEqual(serializer.serialize(V1_MESSAGE), V1_SERIALIZED_MESSAGE);
  t.deepEqual(serializer.deserialize(V1_SERIALIZED_MESSAGE), [
    V1_MESSAGE,
    V1_SERIALIZED_MESSAGE.length,
  ]);
});

test('it can serialize and deserialize V1 transactions', (t) => {
  const serializer = getTransactionV1Serializer();
  const transaction = {
    message: V1_MESSAGE,
    serializedMessage: V1_SERIALIZED_MESSAGE,
    signatures: [V1_SIGNATURE],
  };
  t.deepEqual(serializer.serialize(transaction), V1_TRANSACTION);
  t.deepEqual(serializer.deserialize(V1_TRANSACTION), [
    transaction,
    V1_TRANSACTION.length,
  ]);
});

test('it rejects V1 messages with an invalid config mask', (t) => {
  const serializer = getTransactionV1MessageSerializer();
  const withMask = (mask: number) => {
    const bytes = new Uint8Array(V1_SERIALIZED_MESSAGE);
    bytes[4] = mask;
    return bytes;
  };
  t.throws(() => serializer.deserialize(withMask(0b100000)), {
    message: /Unexpected bits/,
  });
  t.throws(() => serializer.deserialize(withMask(0b00001)), {
    message: /priority fee bits/,
  });
});

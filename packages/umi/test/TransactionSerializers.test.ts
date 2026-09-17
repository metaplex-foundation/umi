import test from 'ava';
import {
  getTransactionMessageSerializer,
  getTransactionSerializer,
  publicKey,
  Transaction,
  TransactionMessage,
} from '../src';

// The same transfer, as a legacy, V0 and V1 message,
// paired with the first byte of its serialized form.
const base = {
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
      data: new Uint8Array([2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
    },
  ],
};
const messages: [TransactionMessage, number][] = [
  [{ ...base, version: 'legacy', addressLookupTables: [] }, 1],
  [
    {
      ...base,
      version: 0,
      addressLookupTables: [
        {
          publicKey: publicKey('So11111111111111111111111111111111111111112'),
          writableIndexes: [1],
          readonlyIndexes: [],
        },
      ],
    },
    0x80,
  ],
  [
    {
      ...base,
      version: 1,
      addressLookupTables: [],
      transactionConfig: { computeUnitLimit: 200_000 },
    },
    0x81,
  ],
];

test('it serializes messages of any version and reads the version back from the first byte', (t) => {
  const serializer = getTransactionMessageSerializer();
  messages.forEach(([message, firstByte]) => {
    const serialized = serializer.serialize(message);
    t.is(serialized[0], firstByte);
    t.deepEqual(serializer.deserialize(serialized)[0], message);
  });
});

test('it serializes transactions of any version and reads the version back from the first byte', (t) => {
  const serializer = getTransactionSerializer();
  messages.forEach(([message]) => {
    const transaction: Transaction = {
      message,
      serializedMessage: getTransactionMessageSerializer().serialize(message),
      signatures: [new Uint8Array(64).fill(7)],
    };
    const serialized = serializer.serialize(transaction);
    t.deepEqual(serializer.deserialize(serialized)[0], transaction);
  });
});

test('it rejects unsupported transaction versions', (t) => {
  t.throws(
    () => getTransactionMessageSerializer().deserialize(new Uint8Array([0x82])),
    { message: /Unsupported transaction version: 2\./ }
  );
});

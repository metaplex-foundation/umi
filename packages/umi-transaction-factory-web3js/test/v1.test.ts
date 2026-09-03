import {
  addTransactionSignature,
  assertValidTransactionConfigInput,
  generateSigner,
  Instruction,
  lamports,
  publicKey,
  SdkError,
  Transaction,
  TransactionConfig,
  TransactionMessage,
  TRANSACTION_CONFIG_MAX,
  TRANSACTION_SIZE_LIMIT,
  TRANSACTION_V1_SIZE_LIMIT,
  Umi,
} from '@metaplex-foundation/umi';
import {
  base16,
  base64,
  NumberOutOfRangeError,
  u32,
} from '@metaplex-foundation/umi/serializers';
import test from 'ava';
import {
  V1_LARGE_TRANSACTION_BASE64,
  V1_TRANSACTION_BASE64,
} from './_fixtures';
import { createLegacyMessage, createUmi, createV0Message } from './_setup';
import { V1_FIXTURES, V1Fixture } from './_v1Fixtures';

const SYSTEM_PROGRAM = publicKey('11111111111111111111111111111111');
const CONFIG_MASK_OFFSET = 4;

const hex = (bytes: Uint8Array): string => base16.deserialize(bytes)[0];
const fromHex = (value: string): Uint8Array => base16.serialize(value);

const getFixture = (name: string): V1Fixture => {
  const fixture = V1_FIXTURES.find((f) => f.name === name);
  if (!fixture) throw new Error(`Unknown fixture ${name}.`);
  return fixture;
};

const toTransactionConfig = ({
  priorityFeeLamports,
  ...config
}: V1Fixture['config']): TransactionConfig =>
  priorityFeeLamports === undefined
    ? config
    : { priorityFee: lamports(priorityFeeLamports), ...config };

const expectedMessage = (fixture: V1Fixture): TransactionMessage => ({
  version: 1,
  header: fixture.header,
  accounts: fixture.accounts.map((account) => publicKey(account)),
  blockhash: fixture.blockhash,
  instructions: fixture.instructions.map((instruction) => ({
    programIndex: instruction.programIndex,
    accountIndexes: instruction.accountIndexes,
    data: fromHex(instruction.dataHex),
  })),
  addressLookupTables: [],
  transactionConfig: toTransactionConfig(fixture.config),
});

const transferInstructions = (fixture: V1Fixture): Instruction[] =>
  fixture.transfers.map((transfer) => ({
    programId: SYSTEM_PROGRAM,
    keys: [
      { pubkey: publicKey(transfer.source), isSigner: true, isWritable: true },
      {
        pubkey: publicKey(transfer.destination),
        isSigner: false,
        isWritable: true,
      },
    ],
    data: fromHex(transfer.dataHex),
  }));

const hasBothLimits = (fixture: V1Fixture): boolean =>
  fixture.config.computeUnitLimit !== undefined &&
  fixture.config.loadedAccountsDataSizeLimit !== undefined;

const createFromFixture = (umi: Umi, fixture: V1Fixture): Transaction => {
  const transactionConfig = toTransactionConfig(fixture.config);
  assertValidTransactionConfigInput(transactionConfig);
  return umi.transactions.create({
    version: 1,
    payer: publicKey(fixture.payer.publicKey),
    instructions: transferInstructions(fixture),
    blockhash: fixture.blockhash,
    transactionConfig,
  });
};

const signWithFixtureKeys = (
  umi: Umi,
  transaction: Transaction,
  fixture: V1Fixture
): Transaction =>
  [fixture.payer, ...(fixture.otherSigner ? [fixture.otherSigner] : [])]
    .map((signer) =>
      umi.eddsa.createKeypairFromSeed(fromHex(signer.secretKeySeedHex))
    )
    .reduce(
      (signed, keypair) =>
        addTransactionSignature(
          signed,
          umi.eddsa.sign(signed.serializedMessage, keypair),
          keypair.publicKey
        ),
      transaction
    );

V1_FIXTURES.forEach((fixture) => {
  test(`it deserializes the ${fixture.name} V1 transaction`, (t) => {
    const umi = createUmi();
    const transaction = umi.transactions.deserialize(fromHex(fixture.wireHex));

    t.deepEqual(transaction.message, expectedMessage(fixture));
    t.deepEqual(transaction.signatures, fixture.signaturesHex.map(fromHex));
    t.is(hex(transaction.serializedMessage), fixture.messageHex);
  });

  test(`it round trips the ${fixture.name} V1 transaction`, (t) => {
    const umi = createUmi();
    const messageBytes = fromHex(fixture.messageHex);
    const wire = fromHex(fixture.wireHex);

    t.deepEqual(
      umi.transactions.serializeMessage(
        umi.transactions.deserializeMessage(messageBytes)
      ),
      messageBytes
    );
    t.deepEqual(
      umi.transactions.serialize(umi.transactions.deserialize(wire)),
      wire
    );
  });
});

test('the fixtures exercise create() with every combination of the optional fields', (t) => {
  t.deepEqual(
    V1_FIXTURES.filter(hasBothLimits).map((fixture) => fixture.name),
    [
      'one-transfer-fee-cu-data',
      'two-signers-all-config',
      'forty-transfers-cu-data',
      'subset-6-computeUnitLimit+loadedAccountsDataSizeLimit',
      'subset-7-priorityFeeLamports+computeUnitLimit+loadedAccountsDataSizeLimit',
      'subset-14-computeUnitLimit+loadedAccountsDataSizeLimit+heapSize',
      'subset-15-priorityFeeLamports+computeUnitLimit+loadedAccountsDataSizeLimit+heapSize',
    ]
  );
});

V1_FIXTURES.filter(
  (fixture) =>
    hasBothLimits(fixture) && fixture.name !== 'forty-transfers-cu-data'
).forEach((fixture) => {
  test(`it creates and signs the ${fixture.name} V1 transaction byte for byte`, (t) => {
    const umi = createUmi();
    const transaction = createFromFixture(umi, fixture);
    t.deepEqual(transaction.message, expectedMessage(fixture));
    t.is(hex(transaction.serializedMessage), fixture.messageHex);

    const signed = signWithFixtureKeys(umi, transaction, fixture);
    t.deepEqual(signed.signatures.map(hex), fixture.signaturesHex);
    t.is(hex(umi.transactions.serialize(signed)), fixture.wireHex);
  });
});

test('it creates a 40-transfer V1 transaction equivalent to the kit fixture', (t) => {
  // web3.js orders non-signer accounts by first use whereas kit sorts
  // them, so only the structure of this fixture can be compared.
  const umi = createUmi();
  const fixture = getFixture('forty-transfers-cu-data');
  const transaction = createFromFixture(umi, fixture);

  t.deepEqual(transaction.message.header, fixture.header);
  t.deepEqual(
    [...transaction.message.accounts].sort(),
    [...fixture.accounts].sort()
  );
  t.is(transaction.message.instructions.length, fixture.instructions.length);
  t.deepEqual(
    transaction.message.transactionConfig,
    toTransactionConfig(fixture.config)
  );

  const wire = umi.transactions.serialize(
    signWithFixtureKeys(umi, transaction, fixture)
  );
  t.is(wire.length, fixture.wireHex.length / 2);
  t.true(wire.length > TRANSACTION_SIZE_LIMIT);
  t.true(wire.length <= TRANSACTION_V1_SIZE_LIMIT);
});

test('it deserializes the V1 transaction published by web3.js', (t) => {
  const umi = createUmi();
  const wire = base64.serialize(V1_TRANSACTION_BASE64);
  const transaction = umi.transactions.deserialize(wire);

  t.like(transaction.message, {
    version: 1,
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    blockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
    addressLookupTables: [],
    transactionConfig: {
      priorityFee: lamports(5000),
      computeUnitLimit: 30_000,
      loadedAccountsDataSizeLimit: 200_000,
    },
  });
  t.is(transaction.message.accounts.length, 3);
  t.is(transaction.message.instructions.length, 1);
  t.is(transaction.signatures.length, 1);
  t.is(transaction.serializedMessage.length, wire.length - 64);
  t.deepEqual(umi.transactions.serialize(transaction), wire);
});

test('it deserializes the large V1 transaction published by web3.js', (t) => {
  const umi = createUmi();
  const wire = base64.serialize(V1_LARGE_TRANSACTION_BASE64);
  t.true(wire.length > TRANSACTION_SIZE_LIMIT);
  t.true(wire.length <= TRANSACTION_V1_SIZE_LIMIT);

  const transaction = umi.transactions.deserialize(wire);
  t.like(transaction.message, {
    version: 1,
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 2,
    },
    transactionConfig: {
      priorityFee: lamports(123_456_789),
      computeUnitLimit: 1_400_000,
      loadedAccountsDataSizeLimit: 65_536,
      heapSize: 65_536,
    },
  });
  t.is(transaction.message.accounts.length, 4);
  t.is(transaction.message.instructions.length, 2);
  t.is(transaction.message.instructions[1].data.length, 3700);
  t.deepEqual(
    umi.transactions.serializeMessage(transaction.message),
    transaction.serializedMessage
  );
  t.deepEqual(umi.transactions.serialize(transaction), wire);
});

test('it rejects unsupported transaction versions', (t) => {
  const umi = createUmi();
  const messageBytes = fromHex(
    getFixture('one-transfer-empty-config').messageHex
  );
  messageBytes[0] = 0x82;

  t.throws(() => umi.transactions.deserializeMessage(messageBytes), {
    instanceOf: SdkError,
    message: /^Unsupported transaction version: 2\./,
  });
});

test('it rejects unknown transaction config bits', (t) => {
  const umi = createUmi();
  const messageBytes = fromHex(
    getFixture('one-transfer-fee-cu-data').messageHex
  );
  messageBytes[CONFIG_MASK_OFFSET] |= 0b100000;

  t.throws(() => umi.transactions.deserializeMessage(messageBytes), {
    instanceOf: SdkError,
    message: /config mask/,
  });
});

test('it rejects a priority fee with a single mask bit set', (t) => {
  const umi = createUmi();
  const messageBytes = fromHex(getFixture('one-transfer-cu-heap').messageHex);
  messageBytes[CONFIG_MASK_OFFSET] |= 0b1;

  t.throws(() => umi.transactions.deserializeMessage(messageBytes), {
    instanceOf: SdkError,
    message: /priority fee/,
  });
});

test('it rejects address lookup tables on V1 messages', (t) => {
  const umi = createUmi();
  const message: TransactionMessage = {
    ...expectedMessage(getFixture('one-transfer-empty-config')),
    addressLookupTables: [
      {
        publicKey: generateSigner(umi).publicKey,
        writableIndexes: [0],
        readonlyIndexes: [],
      },
    ],
  };

  t.throws(() => umi.transactions.serializeMessage(message), {
    instanceOf: SdkError,
    message: /lookup tables/,
  });
});

test('it rejects transaction configs on legacy and V0 messages', (t) => {
  const umi = createUmi();
  const [legacyMessage] = createLegacyMessage(umi);
  const [v0Message] = createV0Message(umi);

  [legacyMessage, v0Message].forEach((message) => {
    t.throws(
      () =>
        umi.transactions.serializeMessage({
          ...message,
          transactionConfig: {},
        }),
      { instanceOf: SdkError, message: /only supported by V1/ }
    );
  });
});

test('it serializes oversized V1 messages so that builders can measure them', (t) => {
  const umi = createUmi();
  const message = expectedMessage(getFixture('one-transfer-empty-config'));
  const oversized: TransactionMessage = {
    ...message,
    header: { ...message.header, numRequiredSignatures: 13 },
    accounts: Array.from({ length: 65 }, () => generateSigner(umi).publicKey),
    instructions: Array.from({ length: 65 }, () => message.instructions[0]),
  };

  const serialized = umi.transactions.serializeMessage(oversized);
  const headerSize = 1 + 3 + 4 + 32 + 1 + 1;
  t.is(
    serialized.length,
    headerSize +
      oversized.accounts.length * 32 +
      oversized.instructions.reduce(
        (sum, ix) => sum + 4 + ix.accountIndexes.length + ix.data.length,
        0
      )
  );
  t.deepEqual(umi.transactions.deserializeMessage(serialized), oversized);
});

test('it still routes envelopes with 128 signatures to the legacy and V0 decoder', (t) => {
  const umi = createUmi();
  const message: TransactionMessage = {
    version: 0,
    header: {
      numRequiredSignatures: 128,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 0,
    },
    accounts: Array.from({ length: 128 }, () => generateSigner(umi).publicKey),
    blockhash: '11111111111111111111111111111111',
    instructions: [],
    addressLookupTables: [],
  };
  const transaction: Transaction = {
    message,
    serializedMessage: umi.transactions.serializeMessage(message),
    signatures: Array.from({ length: 128 }, () => new Uint8Array(64)),
  };

  const wire = umi.transactions.serialize(transaction);
  t.is(wire[0], 0x80);
  t.deepEqual(umi.transactions.deserialize(wire), transaction);
});

test('it rejects account indexes a V1 message cannot hold', (t) => {
  const umi = createUmi();
  const message = expectedMessage(getFixture('one-transfer-empty-config'));
  const [instruction] = message.instructions;

  t.throws(
    () =>
      umi.transactions.serializeMessage({
        ...message,
        instructions: [{ ...instruction, accountIndexes: [0, 256] }],
      }),
    { instanceOf: NumberOutOfRangeError }
  );
});

test('it counts the signatures of a V1 transaction from its serialized message', (t) => {
  const umi = createUmi();
  const fixture = getFixture('two-signers-all-config');
  const transaction = umi.transactions.deserialize(fromHex(fixture.wireHex));
  const { header } = transaction.message;

  t.throws(
    () =>
      umi.transactions.serialize({
        ...transaction,
        signatures: transaction.signatures.slice(0, 1),
      }),
    { instanceOf: SdkError, message: /Expected 2 signatures but got 1/ }
  );
  t.is(
    hex(
      umi.transactions.serialize({
        ...transaction,
        message: {
          ...transaction.message,
          header: { ...header, numRequiredSignatures: 1 },
        },
      })
    ),
    fixture.wireHex
  );
});

test('it rejects trailing bytes after a V1 transaction', (t) => {
  const umi = createUmi();
  const wire = fromHex(getFixture('two-signers-all-config').wireHex);

  t.throws(() => umi.transactions.deserialize(new Uint8Array([...wire, 0])), {
    instanceOf: SdkError,
    message: /1 trailing bytes/,
  });
});

test('it rejects V1 transactions whose serialized message is not V1', (t) => {
  const umi = createUmi();
  const [v0Message] = createV0Message(umi);
  const v1Message = expectedMessage(getFixture('one-transfer-empty-config'));

  t.throws(
    () =>
      umi.transactions.serialize({
        message: v1Message,
        serializedMessage: umi.transactions.serializeMessage(v0Message),
        signatures: [new Uint8Array(64)],
      }),
    { instanceOf: SdkError, message: /V1 prefix/ }
  );
});

test('it validates the heap size of V1 transactions', (t) => {
  const umi = createUmi();
  const fixture = getFixture('one-transfer-empty-config');
  const createWithHeapSize = (heapSize: number) =>
    umi.transactions.create({
      version: 1,
      payer: publicKey(fixture.payer.publicKey),
      instructions: transferInstructions(fixture),
      blockhash: fixture.blockhash,
      transactionConfig: { ...TRANSACTION_CONFIG_MAX, heapSize },
    });

  t.is(
    createWithHeapSize(32 * 1024).message.transactionConfig?.heapSize,
    32 * 1024
  );
  t.is(
    createWithHeapSize(256 * 1024).message.transactionConfig?.heapSize,
    256 * 1024
  );
  [31 * 1024, 257 * 1024, 32 * 1024 + 1].forEach((heapSize) => {
    t.throws(() => createWithHeapSize(heapSize), {
      instanceOf: SdkError,
      message: /heap size/,
    });
  });
});

test('the fixtures cover every valid config mask', (t) => {
  const validMasks = Array.from({ length: 32 }, (_, mask) => mask).filter(
    (mask) => (mask & 0b11) === 0 || (mask & 0b11) === 0b11
  );
  t.deepEqual(
    [...new Set(V1_FIXTURES.map((fixture) => fixture.configMask))].sort(
      (a, b) => a - b
    ),
    validMasks
  );
  V1_FIXTURES.forEach((fixture) => {
    const messageBytes = fromHex(fixture.messageHex);
    t.is(
      u32().deserialize(messageBytes, CONFIG_MASK_OFFSET)[0],
      fixture.configMask
    );
  });
});

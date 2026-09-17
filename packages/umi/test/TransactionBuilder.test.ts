import test from 'ava';
import {
  COMPUTE_BUDGET_PROGRAM_ID,
  createBaseUmi,
  createNoopSigner,
  lamports,
  publicKey,
  transactionBuilder,
  TransactionInput,
  TransactionMessage,
  Umi,
} from '../src';
import { createUmi, mockInstruction, transferSol } from './_setup';

/** Fakes a V0 transaction factory that records the inputs given to `create`. */
const captureTransactionInputs = (umi: Umi): TransactionInput[] => {
  const inputs: TransactionInput[] = [];
  umi.transactions.getDefaultVersion = () => 0;
  umi.transactions.create = (input) => {
    inputs.push(input);
    return {
      message: {} as TransactionMessage,
      serializedMessage: new Uint8Array(),
      signatures: [],
    };
  };
  return inputs;
};

const feePayer = createNoopSigner(
  publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg')
);

test.skip('it can get the size of the transaction to build', (t) => {
  const umi = createUmi();
  const builder = transactionBuilder().add(transferSol(umi));
  t.is(builder.getTransactionSize(umi), 305);
});

test.skip('it can split instructions by index', (t) => {
  // Given a builder with two instructions.
  const umi = createUmi();
  const instructionA = transferSol(umi);
  const instructionB = transferSol(umi);
  const builder = transactionBuilder().add(instructionA).add(instructionB);

  // When we split the builder by index in the middle.
  const [first, second] = builder.splitByIndex(1);

  // Then we get two builders with the correct instructions.
  t.deepEqual(first.items, [instructionA]);
  t.deepEqual(second.items, [instructionB]);
});

test.skip('it can split instructions by transaction size', (t) => {
  // Given a builder with 100 instructions.
  const umi = createUmi();
  const instructions = Array.from({ length: 100 }).map(() => transferSol(umi));
  const builder = transactionBuilder().add(instructions);

  // When we split the builder by transaction size.
  const builders = builder.unsafeSplitByTransactionSize(umi);

  // Then we get 15 builders such that each fit in one transaction.
  t.is(builders.length, 15);
  builders.forEach((b) => t.true(b.fitsInOneTransaction(umi)));
});

test('it can map instructions', (t) => {
  // Given a transaction builder with two instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have no bytes created on chain.
  t.true(builder.items.every((ix) => ix.bytesCreatedOnChain === 0));

  // When we map the instructions to have 10 bytes created on chain.
  const mappedBuilder = builder.mapInstructions((ix) => ({
    ...ix,
    bytesCreatedOnChain: 10,
  }));

  // Then each instruction was updated accordingly.
  t.true(mappedBuilder.items.every((ix) => ix.bytesCreatedOnChain === 10));
});

test('it can add remaining accounts to the latest instruction', (t) => {
  // Given a transaction builder with two instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have only one account meta.
  t.true(builder.items.every((ix) => ix.instruction.keys.length === 1));

  // When we add remaining accounts to the latest instruction.
  const mappedBuilder = builder.addRemainingAccounts([
    {
      pubkey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'),
      isSigner: false,
      isWritable: false,
    },
  ]);

  // Then the last instruction has 3 account metas.
  t.is(mappedBuilder.items[1].instruction.keys.length, 3);

  // And the first instruction still has 1 account meta.
  t.is(mappedBuilder.items[0].instruction.keys.length, 1);
});

test('it can add remaining accounts to a specific instruction', (t) => {
  // Given a transaction builder with three instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have only one account meta.
  t.true(builder.items.every((ix) => ix.instruction.keys.length === 1));

  // When we add remaining accounts to the second instruction.
  const mappedBuilder = builder.addRemainingAccounts(
    [
      {
        pubkey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'),
        isSigner: false,
        isWritable: false,
      },
    ],
    1
  );

  // Then the second instruction has 3 account metas.
  t.is(mappedBuilder.items[1].instruction.keys.length, 3);

  // And the first and last instructions still have 1 account meta.
  t.is(mappedBuilder.items[0].instruction.keys.length, 1);
  t.is(mappedBuilder.items[2].instruction.keys.length, 1);
});

test('it can add signer accounts to a specific instruction', (t) => {
  // Given a signer.
  const signer = createNoopSigner(
    publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg')
  );

  // Given a transaction builder with three instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have only one account meta.
  t.true(builder.items.every((ix) => ix.instruction.keys.length === 1));

  // When we add signer accounts to the first instruction.
  const mappedBuilder = builder.addRemainingAccounts(
    [
      {
        signer,
        isWritable: true,
      },
    ],
    0
  );

  // Then the first instruction has 2 account metas.
  t.is(mappedBuilder.items[0].instruction.keys.length, 2);

  // And the second and last instructions still have 1 account meta.
  t.is(mappedBuilder.items[1].instruction.keys.length, 1);
  t.is(mappedBuilder.items[2].instruction.keys.length, 1);
});

test('it can add signer and remaining accounts to a specific instruction', (t) => {
  // Given a signer.
  const signer = createNoopSigner(
    publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg')
  );

  // Given a transaction builder with three instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have only one account meta.
  t.true(builder.items.every((ix) => ix.instruction.keys.length === 1));

  // When we add signer accounts to the first instruction.
  const mappedBuilder = builder.addRemainingAccounts(
    [
      {
        pubkey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'),
        isSigner: false,
        isWritable: false,
      },
      {
        signer,
        isWritable: false,
      },
    ],
    0
  );

  // Then the first instruction has 2 account metas.
  t.is(mappedBuilder.items[0].instruction.keys.length, 4);

  // And the second and last instructions still have 1 account meta.
  t.is(mappedBuilder.items[1].instruction.keys.length, 1);
  t.is(mappedBuilder.items[2].instruction.keys.length, 1);
});

test('it builds V1 transactions with a default compute budget', (t) => {
  // Given a V1 builder with two instructions and no explicit config.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  transactionBuilder()
    .add([mockInstruction(), mockInstruction()])
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV1()
    .build(umi);

  // Then the built transaction is a V1 transaction with legacy-like limits.
  const [input] = inputs;
  t.is(input.version, 1);
  if (input.version !== 1) return;
  t.deepEqual(input.transactionConfig, {
    computeUnitLimit: 400_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
  });
});

test('it builds V1 transactions with an explicit compute budget', (t) => {
  // Given a V1 builder with an explicit compute unit limit and priority fee.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV1()
    .setTransactionConfig({
      computeUnitLimit: 50_000,
      priorityFee: lamports(5_000),
    })
    .build(umi);

  // Then the explicit values win and the rest is defaulted.
  const [input] = inputs;
  t.is(input.version, 1);
  if (input.version !== 1) return;
  t.deepEqual(input.transactionConfig, {
    computeUnitLimit: 50_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    priorityFee: lamports(5_000),
  });
});

test('it throws when a legacy or V0 transaction has a transaction config', (t) => {
  // Given a builder with a transaction config.
  const umi = createBaseUmi();
  captureTransactionInputs(umi);
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .setTransactionConfig({ computeUnitLimit: 50_000 });

  // Then building it as anything but V1 throws instead of dropping the config.
  const message = /only supported by V1/;
  t.throws(() => builder.build(umi), { message });
  t.throws(() => builder.useV0().build(umi), { message });
  t.throws(() => builder.useLegacyVersion().build(umi), { message });
  t.notThrows(() => builder.useV1().build(umi));
});

test('it throws when a V1 transaction contains a ComputeBudget instruction', (t) => {
  // Given a V1 builder with a (mock) ComputeBudget instruction.
  const umi = createBaseUmi();
  const builder = transactionBuilder()
    .add({
      instruction: {
        programId: COMPUTE_BUDGET_PROGRAM_ID,
        keys: [],
        data: new Uint8Array([2, 64, 13, 3, 0]),
      },
      signers: [],
      bytesCreatedOnChain: 0,
    })
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV1();

  // Then building it throws instead of silently ignoring the instruction.
  t.throws(() => builder.build(umi), { message: /ComputeBudget/ });
});

test('it uses a larger size limit for V1 transactions', (t) => {
  const umi = createBaseUmi();
  captureTransactionInputs(umi);
  umi.transactions.serialize = () => new Uint8Array(2000);
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer);

  t.is(builder.useV0().minimumTransactionsRequired(umi), 2);
  t.false(builder.useV0().fitsInOneTransaction(umi));
  t.is(builder.useV1().minimumTransactionsRequired(umi), 1);
  t.true(builder.useV1().fitsInOneTransaction(umi));
});

test('it throws when a V1 transaction has address lookup tables', (t) => {
  // Given a V1 builder with address lookup tables.
  const umi = createBaseUmi();
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV1()
    .setAddressLookupTables([
      {
        publicKey: publicKey('11111111111111111111111111111111'),
        addresses: [publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg')],
      },
    ]);

  // Then building it throws instead of silently dropping the tables.
  t.throws(() => builder.build(umi), { message: /lookup tables/ });
});

test('it accepts an empty list of address lookup tables on V1', (t) => {
  // Given a V1 builder whose lookup tables were cleared.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV1()
    .setAddressLookupTables([]);

  // Then it builds a V1 transaction.
  t.notThrows(() => builder.build(umi));
  t.is(inputs[0].version, 1);
});

test('it splits V1 builders into V1 chunks with their own defaults', (t) => {
  // Given a V1 builder with three instructions that weigh 1500 bytes each,
  // so two fit in a 4096-byte V1 transaction but none would fit in a V0 one.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  umi.transactions.serialize = () =>
    new Uint8Array(inputs[inputs.length - 1].instructions.length * 1500);
  const builder = transactionBuilder()
    .add([mockInstruction(), mockInstruction(), mockInstruction()])
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV1()
    .setTransactionConfig({ heapSize: 65_536 });

  // When we split it by transaction size and build each chunk.
  const chunks = builder.unsafeSplitByTransactionSize(umi);
  inputs.length = 0;
  chunks.forEach((chunk) => chunk.build(umi));

  // Then both chunks are V1, keep the config and default their own limits.
  t.is(chunks.length, 2);
  t.deepEqual(
    inputs.map((input) => [
      input.version,
      input.version === 1 ? input.transactionConfig : undefined,
    ]),
    [
      [
        1,
        {
          heapSize: 65_536,
          computeUnitLimit: 400_000,
          loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
        },
      ],
      [
        1,
        {
          heapSize: 65_536,
          computeUnitLimit: 200_000,
          loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
        },
      ],
    ]
  );
});

test('it inherits the default version of the transaction factory', (t) => {
  // Given a factory defaulting to V1 and a builder with no version set.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  umi.transactions.getDefaultVersion = () => 1;
  const builder = transactionBuilder()
    .add([mockInstruction(), mockInstruction()])
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111');

  // Then the builder reports and builds a V1 transaction with default limits.
  t.is(builder.getVersion(umi), 1);
  builder.build(umi);
  const [input] = inputs;
  t.is(input.version, 1);
  if (input.version !== 1) return;
  t.deepEqual(input.transactionConfig, {
    computeUnitLimit: 400_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
  });
});

test('it sizes transactions against the default version of the factory', (t) => {
  // Given a 2000-byte transaction and a builder with no version set.
  const umi = createBaseUmi();
  captureTransactionInputs(umi);
  umi.transactions.serialize = () => new Uint8Array(2000);
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer);

  // Then it fits only once the factory defaults to V1.
  t.false(builder.fitsInOneTransaction(umi));
  umi.transactions.getDefaultVersion = () => 1;
  t.true(builder.fitsInOneTransaction(umi));
});

test('an explicit version wins over the default version of the factory', (t) => {
  // Given a factory defaulting to V1 and a builder explicitly set to V0.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  umi.transactions.getDefaultVersion = () => 1;
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111')
    .useV0();

  // Then the builder stays V0.
  t.is(builder.getVersion(umi), 0);
  builder.build(umi);
  t.is(inputs[0].version, 0);
});

test('it asks the transaction factory for the version when none was set', (t) => {
  // Given a factory whose default version is legacy and a builder with no version set.
  const umi = createBaseUmi();
  const inputs = captureTransactionInputs(umi);
  umi.transactions.getDefaultVersion = () => 'legacy';
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setFeePayer(feePayer)
    .setBlockhash('11111111111111111111111111111111');

  // Then the builder reports and builds the factory's version.
  t.is(builder.getVersion(umi), 'legacy');
  builder.build(umi);
  t.is(inputs[0].version, 'legacy');
});

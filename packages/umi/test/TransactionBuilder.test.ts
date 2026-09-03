import test from 'ava';
import {
  Context,
  createNoopSigner,
  createNullContext,
  lamports,
  PublicKey,
  publicKey,
  RpcInterface,
  transactionBuilder,
  TransactionInput,
  TRANSACTION_CONFIG_MAX,
  WrappedInstruction,
} from '../src';
import { u32, u64, u8 } from '../src/serializers';
import { createUmi, mockInstruction, transferSol } from './_setup';

const BLOCKHASH = '11111111111111111111111111111111';
const PAYER = publicKey('LorisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA');
const COMPUTE_BUDGET_PROGRAM = publicKey(
  'ComputeBudget111111111111111111111111111111'
);

const computeBudgetInstruction = (
  discriminator: number,
  value: Uint8Array
): WrappedInstruction => ({
  instruction: {
    programId: COMPUTE_BUDGET_PROGRAM,
    keys: [],
    data: new Uint8Array([...u8().serialize(discriminator), ...value]),
  },
  bytesCreatedOnChain: 0,
  signers: [],
});
const setComputeUnitLimit = (units: number) =>
  computeBudgetInstruction(2, u32().serialize(units));
const setComputeUnitPrice = (microLamports: number) =>
  computeBudgetInstruction(3, u64().serialize(microLamports));

const stubContext = (
  serializedSize: number,
  inputs: TransactionInput[] = []
): Pick<Context, 'transactions' | 'payer'> => ({
  payer: createNoopSigner(PAYER),
  transactions: {
    ...createNullContext().transactions,
    create: (input) => {
      inputs.push(input);
      const keys = input.instructions.flatMap((ix) => ix.keys);
      const signers = new Set([
        input.payer,
        ...keys.filter((key) => key.isSigner).map((key) => key.pubkey),
      ]);
      const accounts = [
        ...new Set([
          ...signers,
          ...keys.map((key) => key.pubkey),
          ...input.instructions.map((ix) => ix.programId),
        ]),
      ];
      return {
        message: {
          version: input.version ?? 0,
          header: {
            numRequiredSignatures: signers.size,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          accounts,
          blockhash: input.blockhash,
          instructions: input.instructions.map((ix) => ({
            programIndex: accounts.indexOf(ix.programId),
            accountIndexes: ix.keys.map((key) => accounts.indexOf(key.pubkey)),
            data: ix.data,
          })),
          addressLookupTables: [],
        },
        serializedMessage: new Uint8Array(),
        signatures: [],
      };
    },
    serialize: () => new Uint8Array(serializedSize),
  },
});

const uniquePublicKey = (index: number): PublicKey =>
  publicKey(new Uint8Array([...new Uint8Array(30), 1, index]));

const transferInstruction = (
  from: PublicKey,
  to: PublicKey
): WrappedInstruction => ({
  instruction: {
    programId: publicKey('11111111111111111111111111111111'),
    keys: [
      { pubkey: from, isSigner: true, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
    ],
    data: new Uint8Array(),
  },
  bytesCreatedOnChain: 0,
  signers: [],
});

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

test('it defaults to V0 and exposes the chosen version', (t) => {
  const builder = transactionBuilder();
  t.is(builder.getVersion(), 0);
  t.is(builder.useLegacyVersion().getVersion(), 'legacy');
  t.is(builder.useV0().getVersion(), 0);
  t.is(builder.useV1().getVersion(), 1);
  t.is(builder.useV1().useV0().getVersion(), 0);
});

test('it ignores the options that do not apply to the transaction version', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);
  const addressLookupTables = [{ publicKey: PAYER, addresses: [] }];
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setBlockhash(BLOCKHASH)
    .setAddressLookupTables(addressLookupTables)
    .setTransactionConfig({ heapSize: 65_536 });

  builder.useLegacyVersion().build(context);
  builder.useV0().build(context);
  builder.useV1().build(context);

  t.deepEqual(inputs[0].version, 'legacy');
  t.false('addressLookupTables' in inputs[0]);
  t.false('transactionConfig' in inputs[0]);
  t.like(inputs[1], { version: 0, addressLookupTables });
  t.false('transactionConfig' in inputs[1]);
  t.like(inputs[2], { version: 1, transactionConfig: { heapSize: 65_536 } });
  t.false('addressLookupTables' in inputs[2]);
});

test('it merges transaction configs', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);

  transactionBuilder()
    .add(mockInstruction())
    .setBlockhash(BLOCKHASH)
    .setTransactionConfig({ computeUnitLimit: 50_000, heapSize: 65_536 })
    .useV1({ priorityFee: lamports(1_000), heapSize: 131_072 })
    .setTransactionConfig({ loadedAccountsDataSizeLimit: 32_768 })
    .build(context);

  t.like(inputs[0], {
    version: 1,
    transactionConfig: {
      priorityFee: lamports(1_000),
      computeUnitLimit: 50_000,
      loadedAccountsDataSizeLimit: 32_768,
      heapSize: 131_072,
    },
  });
});

test('it uses the size limit of the transaction version to count transactions', (t) => {
  const context = stubContext(2000);
  const builder = transactionBuilder().add(mockInstruction());

  t.is(builder.minimumTransactionsRequired(context), 2);
  t.is(builder.useLegacyVersion().minimumTransactionsRequired(context), 2);
  t.is(builder.useV0().minimumTransactionsRequired(context), 2);
  t.false(builder.fitsInOneTransaction(context));
  t.is(builder.useV1().minimumTransactionsRequired(context), 1);
  t.true(builder.useV1().fitsInOneTransaction(context));
});

test('it measures V1 transactions with every config field present', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setBlockhash(BLOCKHASH)
    .useV1();

  builder.getTransactionSize(context);
  builder
    .setTransactionConfig({ priorityFee: lamports(5) })
    .fitsInOneTransaction(context);
  builder.build(context);

  t.like(inputs[0], {
    transactionConfig: {
      priorityFee: lamports(0),
      computeUnitLimit: 200_000,
      loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
      heapSize: 32 * 1024,
    },
  });
  t.like(inputs[1], { transactionConfig: { priorityFee: lamports(5) } });
  const built = inputs[2];
  t.deepEqual(built.version === 1 ? built.transactionConfig : undefined, {
    computeUnitLimit: 200_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
  });
});

test('it estimates the compute budget of V1 transactions by simulation', async (t) => {
  const inputs: TransactionInput[] = [];
  const simulations: Parameters<RpcInterface['simulateTransaction']>[] = [];
  const context: Pick<Context, 'rpc' | 'transactions' | 'payer'> = {
    ...stubContext(0, inputs),
    rpc: {
      ...createNullContext().rpc,
      simulateTransaction: async (...args) => {
        simulations.push(args);
        return {
          err: null,
          logs: [],
          unitsConsumed: 6000,
          loadedAccountsDataSize: 14,
        };
      },
    },
  };
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setTransactionConfig({ priorityFee: lamports(1_000), heapSize: 65_536 });

  const estimated = await builder.setEstimatedTransactionConfig(context, {
    computeUnitMargin: 0.5,
    simulate: { commitment: 'processed' },
  });

  t.like(inputs[0], {
    version: 1,
    blockhash: BLOCKHASH,
    transactionConfig: {
      ...TRANSACTION_CONFIG_MAX,
      priorityFee: lamports(1_000),
      heapSize: 65_536,
    },
  });
  t.is(simulations.length, 1);
  t.deepEqual(simulations[0][1], {
    commitment: 'processed',
    replaceRecentBlockhash: true,
    verifySignatures: false,
  });
  t.is(estimated.getVersion(), 1);
  t.deepEqual(estimated.options.transactionConfig, {
    priorityFee: lamports(1_000),
    heapSize: 65_536,
    computeUnitLimit: 9000,
    loadedAccountsDataSizeLimit: 32_768,
  });
  t.is(estimated.getBlockhash(), undefined);
});

test('it splits V1 transactions by their protocol limits', (t) => {
  const context = stubContext(100);
  const seventyRecipients = transactionBuilder().add(
    Array.from({ length: 70 }, (_, i) =>
      transferInstruction(PAYER, uniquePublicKey(i))
    )
  );

  t.true(seventyRecipients.fitsInOneTransaction(context));
  t.false(seventyRecipients.useV1().fitsInOneTransaction(context));
  const builders = seventyRecipients
    .useV1()
    .unsafeSplitByTransactionSize(context);
  t.is(builders.length, 2);
  t.is(builders[0].items.length, 62);
  t.is(builders[1].items.length, 8);
  builders.forEach((builder) => t.true(builder.fitsInOneTransaction(context)));

  const sixtyFiveInstructions = transactionBuilder().add(
    Array.from({ length: 65 }, () => transferInstruction(PAYER, PAYER))
  );
  t.true(sixtyFiveInstructions.fitsInOneTransaction(context));
  t.false(sixtyFiveInstructions.useV1().fitsInOneTransaction(context));
  const thirteenSigners = transactionBuilder().add(
    Array.from({ length: 12 }, (_, i) =>
      transferInstruction(uniquePublicKey(i), PAYER)
    )
  );
  t.true(thirteenSigners.fitsInOneTransaction(context));
  t.false(thirteenSigners.useV1().fitsInOneTransaction(context));
  t.true(
    thirteenSigners.useV1().splitByIndex(1)[1].fitsInOneTransaction(context)
  );
});

test('it defaults the compute budget of V1 transactions', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);
  const twoInstructions = transactionBuilder()
    .add([mockInstruction(), mockInstruction()])
    .setBlockhash(BLOCKHASH);
  const fortyInstructions = transactionBuilder()
    .add(Array.from({ length: 40 }, mockInstruction))
    .setBlockhash(BLOCKHASH);

  twoInstructions.useV1().build(context);
  fortyInstructions.useV1().build(context);
  twoInstructions
    .useV1()
    .setTransactionConfig({ computeUnitLimit: 50_000, heapSize: 65_536 })
    .build(context);
  twoInstructions.build(context);
  twoInstructions.useLegacyVersion().build(context);

  t.like(inputs[0], {
    version: 1,
    transactionConfig: {
      computeUnitLimit: 400_000,
      loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    },
  });
  t.like(inputs[1], { transactionConfig: { computeUnitLimit: 1_400_000 } });
  t.like(inputs[2], {
    transactionConfig: {
      computeUnitLimit: 50_000,
      loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
      heapSize: 65_536,
    },
  });
  t.false('transactionConfig' in inputs[3]);
  t.false('transactionConfig' in inputs[4]);
});

test('it keeps the default limits when the config sets them to undefined', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);

  transactionBuilder()
    .add(mockInstruction())
    .setBlockhash(BLOCKHASH)
    .useV1({ computeUnitLimit: undefined, heapSize: 65_536 })
    .setTransactionConfig({ heapSize: undefined, priorityFee: lamports(1) })
    .build(context);

  const [input] = inputs;
  t.deepEqual(input.version === 1 ? input.transactionConfig : undefined, {
    computeUnitLimit: 200_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    heapSize: 65_536,
    priorityFee: lamports(1),
  });
});

test('it folds ComputeBudget instructions into the config of V1 transactions', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);
  const transfer = mockInstruction();
  const buildConfig = (...items: WrappedInstruction[]) => {
    const transaction = transactionBuilder()
      .add(items)
      .setBlockhash(BLOCKHASH)
      .useV1()
      .build(context);
    const input = inputs[inputs.length - 1];
    t.deepEqual(input.instructions, [transfer.instruction]);
    t.is(transaction.message.instructions.length, 1);
    t.false(transaction.message.accounts.includes(COMPUTE_BUDGET_PROGRAM));
    return input.version === 1 ? input.transactionConfig : undefined;
  };

  t.deepEqual(buildConfig(setComputeUnitLimit(50_000), transfer), {
    computeUnitLimit: 50_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
  });
  t.deepEqual(buildConfig(setComputeUnitPrice(1_000), transfer), {
    computeUnitLimit: 200_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    priorityFee: lamports(200),
  });
  t.deepEqual(
    buildConfig(
      setComputeUnitLimit(50_000),
      setComputeUnitPrice(1_000),
      transfer
    ),
    {
      computeUnitLimit: 50_000,
      loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
      priorityFee: lamports(50),
    }
  );
  t.deepEqual(buildConfig(transfer, setComputeUnitPrice(1)), {
    computeUnitLimit: 200_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    priorityFee: lamports(1),
  });
  t.deepEqual(
    buildConfig(
      computeBudgetInstruction(1, u32().serialize(65_536)),
      computeBudgetInstruction(4, u32().serialize(98_304)),
      transfer
    ),
    {
      computeUnitLimit: 200_000,
      loadedAccountsDataSizeLimit: 98_304,
      heapSize: 65_536,
    }
  );
});

test('it lets the explicit config override folded ComputeBudget instructions', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);
  const builder = transactionBuilder()
    .add([
      setComputeUnitLimit(50_000),
      setComputeUnitPrice(1_000),
      mockInstruction(),
    ])
    .setBlockhash(BLOCKHASH);

  builder.useV1({ computeUnitLimit: 100_000 }).build(context);
  builder
    .useV1({ computeUnitLimit: 100_000, priorityFee: lamports(7) })
    .build(context);

  t.like(inputs[0], {
    transactionConfig: {
      computeUnitLimit: 100_000,
      priorityFee: lamports(100),
    },
  });
  t.like(inputs[1], {
    transactionConfig: { computeUnitLimit: 100_000, priorityFee: lamports(7) },
  });
});

test('it keeps unknown ComputeBudget instructions and other versions untouched', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(0, inputs);
  const unknown = computeBudgetInstruction(9, u32().serialize(1));
  const items = [setComputeUnitLimit(50_000), unknown, mockInstruction()];
  const builder = transactionBuilder().add(items).setBlockhash(BLOCKHASH);

  builder.useV1().build(context);
  builder.build(context);
  builder.useLegacyVersion().build(context);

  t.deepEqual(inputs[0].instructions, [
    unknown.instruction,
    items[2].instruction,
  ]);
  t.deepEqual(
    inputs[1].instructions,
    items.map((item) => item.instruction)
  );
  t.deepEqual(
    inputs[2].instructions,
    items.map((item) => item.instruction)
  );
});

test('it counts the transactions a V1 builder needs by every protocol limit', (t) => {
  const inputs: TransactionInput[] = [];
  const context = stubContext(100, inputs);
  const seventyRecipients = transactionBuilder()
    .add(
      Array.from({ length: 70 }, (_, i) =>
        transferInstruction(PAYER, uniquePublicKey(i))
      )
    )
    .useV1();
  const threeHundredInstructions = transactionBuilder().add(
    Array.from({ length: 300 }, () => transferInstruction(PAYER, PAYER))
  );

  t.is(seventyRecipients.minimumTransactionsRequired(context), 2);
  t.false(seventyRecipients.fitsInOneTransaction(context));

  inputs.length = 0;
  t.is(
    threeHundredInstructions.useV1().minimumTransactionsRequired(context),
    5
  );
  t.false(threeHundredInstructions.useV1().fitsInOneTransaction(context));
  t.is(inputs.length, 0);
  t.is(threeHundredInstructions.minimumTransactionsRequired(context), 1);
  t.true(threeHundredInstructions.fitsInOneTransaction(context));
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

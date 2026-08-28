import test from 'ava';
import {
  PublicKey,
  RpcConfirmTransactionStrategy,
  SdkError,
  Transaction,
  createNoopSigner,
  generateSigner,
  publicKey,
  transactionBuilder,
} from '../src';
import {
  MOCK_BLOCKHASH,
  createMockUmi,
  createUmi,
  mockInstruction,
  transferSol,
} from './_setup';

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

// -----------------
// Tests below use the mock context helpers from `_setup`
// to cover building, sizing, and sending transactions.
// -----------------

test('it starts empty and can be emptied while keeping options', (t) => {
  const builder = transactionBuilder()
    .add(mockInstruction())
    .setVersion('legacy');
  t.is(builder.items.length, 1);

  const emptied = builder.empty();
  t.deepEqual(emptied.items, []);
  t.is(emptied.options.version, 'legacy');
});

test('it can set, prepend and append items', (t) => {
  const ixA = mockInstruction();
  const ixB = mockInstruction();
  const ixC = mockInstruction();

  const builder = transactionBuilder().setItems([ixA]);
  t.deepEqual(builder.items, [ixA]);

  const prepended = builder.prepend(ixB);
  t.deepEqual(prepended.items, [ixB, ixA]);

  const appended = prepended.append(ixC);
  t.deepEqual(appended.items, [ixB, ixA, ixC]);
});

test('it can add other builders and arrays of builders', (t) => {
  const ixA = mockInstruction();
  const ixB = mockInstruction();
  const ixC = mockInstruction();
  const builderA = transactionBuilder().add(ixA);
  const builderB = transactionBuilder().add(ixB);
  const builderC = transactionBuilder().add(ixC);

  const combined = transactionBuilder().add(builderA).add([builderB, builderC]);
  t.deepEqual(combined.items, [ixA, ixB, ixC]);
});

test('it can split instructions by index using a mock context', (t) => {
  const ixA = mockInstruction();
  const ixB = mockInstruction();
  const builder = transactionBuilder().add(ixA).add(ixB).setVersion(0);

  const [first, second] = builder.splitByIndex(1);
  t.deepEqual(first.items, [ixA]);
  t.deepEqual(second.items, [ixB]);
  t.is(first.options.version, 0);
  t.is(second.options.version, 0);
});

test('it can set the transaction version', (t) => {
  const builder = transactionBuilder();
  t.is(builder.options.version, undefined);
  t.is(builder.setVersion('legacy').options.version, 'legacy');
  t.is(builder.setVersion(0).options.version, 0);
  t.is(builder.useLegacyVersion().options.version, 'legacy');
  t.is(builder.useV0().options.version, 0);
});

test('it can set and get the fee payer', (t) => {
  const umi = createMockUmi();
  const builder = transactionBuilder();
  t.is(builder.getFeePayer(umi), umi.payer);

  const feePayer = generateSigner(umi);
  const withFeePayer = builder.setFeePayer(feePayer);
  t.is(withFeePayer.getFeePayer(umi), feePayer);
});

test('it can set and get the blockhash', (t) => {
  const builder = transactionBuilder();
  t.is(builder.getBlockhash(), undefined);

  const asString = builder.setBlockhash('SomeBlockhash');
  t.is(asString.getBlockhash(), 'SomeBlockhash');

  const asObject = builder.setBlockhash({
    blockhash: 'SomeOtherBlockhash',
    lastValidBlockHeight: 42,
  });
  t.is(asObject.getBlockhash(), 'SomeOtherBlockhash');
});

test('it can set the latest blockhash from the RPC', async (t) => {
  const umi = createMockUmi();
  const builder = await transactionBuilder().setLatestBlockhash(umi);
  t.is(builder.getBlockhash(), MOCK_BLOCKHASH);
});

test('it can get its instructions and signers', (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  const ixA = transferSol(umi, { from: signer });
  const ixB = transferSol(umi, { from: signer });
  const builder = transactionBuilder().add(ixA).add(ixB);

  t.deepEqual(builder.getInstructions(), [ixA.instruction, ixB.instruction]);

  // The fee payer comes first and duplicated signers are removed.
  t.deepEqual(builder.getSigners(umi), [umi.payer, signer]);
});

test('it can compute the bytes and rent created on chain', async (t) => {
  const umi = createMockUmi();
  const builder = transactionBuilder()
    .add({ ...mockInstruction(), bytesCreatedOnChain: 100 })
    .add({ ...mockInstruction(), bytesCreatedOnChain: 50 });

  t.is(builder.getBytesCreatedOnChain(), 150);

  // The mock RPC charges 10 lamports per byte.
  const rent = await builder.getRentCreatedOnChain(umi);
  t.is(rent.basisPoints, 1500n);
  t.is(rent.identifier, 'SOL');
});

test('it can compute the size of the transaction to build', (t) => {
  const umi = createMockUmi();
  const builder = transactionBuilder().add(transferSol(umi));
  const size = builder.getTransactionSize(umi);
  t.true(size > 0);

  // Adding more instructions increases the size.
  const biggerBuilder = builder.add(transferSol(umi));
  t.true(biggerBuilder.getTransactionSize(umi) > size);
});

test('it can tell how many transactions are required', (t) => {
  const umi = createMockUmi();
  const smallBuilder = transactionBuilder().add(transferSol(umi));
  t.is(smallBuilder.minimumTransactionsRequired(umi), 1);
  t.true(smallBuilder.fitsInOneTransaction(umi));

  const instructions = Array.from({ length: 50 }).map(() => transferSol(umi));
  const bigBuilder = transactionBuilder().add(instructions);
  t.true(bigBuilder.minimumTransactionsRequired(umi) > 1);
  t.false(bigBuilder.fitsInOneTransaction(umi));
});

test('it can split instructions by transaction size using a mock context', (t) => {
  const umi = createMockUmi();
  const instructions = Array.from({ length: 50 }).map(() => transferSol(umi));
  const builder = transactionBuilder().add(instructions);
  t.false(builder.fitsInOneTransaction(umi));

  const builders = builder.unsafeSplitByTransactionSize(umi);
  t.true(builders.length > 1);
  builders.forEach((b) => t.true(b.fitsInOneTransaction(umi)));

  // No instruction is lost or duplicated.
  const splitItems = builders.flatMap((b) => b.items);
  t.deepEqual(splitItems, builder.items);
});

test('it cannot build a transaction without a blockhash', (t) => {
  const umi = createMockUmi();
  const builder = transactionBuilder().add(transferSol(umi));
  t.throws(() => builder.build(umi), {
    instanceOf: SdkError,
    message: /Setting a blockhash is required/,
  });
});

test('it can build a transaction with a blockhash', (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  const transaction = transactionBuilder()
    .add(transferSol(umi, { from: signer }))
    .setBlockhash('SomeBlockhash')
    .build(umi);

  t.is(transaction.message.blockhash, 'SomeBlockhash');
  t.is(transaction.message.version, 0);
  t.is(transaction.message.accounts[0], umi.payer.publicKey);
  t.is(transaction.message.header.numRequiredSignatures, 2);
  t.is(transaction.signatures.length, 2);
});

test('it only attaches address lookup tables to v0 transactions', (t) => {
  const umi = createMockUmi();
  const lut = {
    publicKey: generateSigner(umi).publicKey,
    addresses: [] as PublicKey[],
  };
  const builder = transactionBuilder()
    .add(transferSol(umi))
    .setAddressLookupTables([lut])
    .setBlockhash('SomeBlockhash');

  const v0Transaction = builder.useV0().build(umi);
  t.is(v0Transaction.message.addressLookupTables.length, 1);
  t.is(v0Transaction.message.addressLookupTables[0].publicKey, lut.publicKey);

  const legacyTransaction = builder.useLegacyVersion().build(umi);
  t.is(legacyTransaction.message.addressLookupTables.length, 0);
});

test('it can build using the latest blockhash', async (t) => {
  const umi = createMockUmi();
  const transaction = await transactionBuilder()
    .add(transferSol(umi))
    .buildWithLatestBlockhash(umi);
  t.is(transaction.message.blockhash, MOCK_BLOCKHASH);

  // An existing blockhash is kept.
  const withBlockhash = await transactionBuilder()
    .add(transferSol(umi))
    .setBlockhash('ExistingBlockhash')
    .buildWithLatestBlockhash(umi);
  t.is(withBlockhash.message.blockhash, 'ExistingBlockhash');
});

test('it can build and sign a transaction', async (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  const transaction = await transactionBuilder()
    .add(transferSol(umi, { from: signer }))
    .buildAndSign(umi);

  t.is(transaction.signatures.length, 2);
  transaction.signatures.forEach((signature) => {
    t.false(signature.every((byte) => byte === 0));
  });
});

test('it can send a transaction', async (t) => {
  const history = { sent: [] as Transaction[], confirmed: [] as Uint8Array[] };
  const umi = createMockUmi(history);
  const signature = await transactionBuilder().add(transferSol(umi)).send(umi);

  t.is(history.sent.length, 1);
  t.deepEqual(signature, history.sent[0].signatures[0]);
});

test('it can confirm a transaction using the builder blockhash', async (t) => {
  const umi = createMockUmi();
  const strategies: RpcConfirmTransactionStrategy[] = [];
  umi.rpc = {
    ...umi.rpc,
    confirmTransaction: async (signature, options) => {
      strategies.push(options.strategy);
      return { context: { slot: 1 }, value: { err: null } };
    },
  };

  const builder = transactionBuilder()
    .add(transferSol(umi))
    .setBlockhash({ blockhash: 'BuilderBlockhash', lastValidBlockHeight: 99 });
  const result = await builder.confirm(umi, new Uint8Array(64));

  t.deepEqual(result, { context: { slot: 1 }, value: { err: null } });
  t.deepEqual(strategies, [
    {
      type: 'blockhash',
      blockhash: 'BuilderBlockhash',
      lastValidBlockHeight: 99,
    },
  ]);
});

test('it can confirm a transaction using an explicit strategy', async (t) => {
  const umi = createMockUmi();
  const strategies: RpcConfirmTransactionStrategy[] = [];
  umi.rpc = {
    ...umi.rpc,
    confirmTransaction: async (signature, options) => {
      strategies.push(options.strategy);
      return { context: { slot: 1 }, value: { err: null } };
    },
  };

  const strategy: RpcConfirmTransactionStrategy = {
    type: 'durableNonce',
    minContextSlot: 1,
    nonceAccountPubkey: publicKey('11111111111111111111111111111111'),
    nonceValue: 'nonce',
  };
  await transactionBuilder()
    .add(transferSol(umi))
    .confirm(umi, new Uint8Array(64), { strategy });
  t.deepEqual(strategies, [strategy]);
});

test('it fetches the latest blockhash to confirm when none is set', async (t) => {
  const umi = createMockUmi();
  const strategies: RpcConfirmTransactionStrategy[] = [];
  umi.rpc = {
    ...umi.rpc,
    confirmTransaction: async (signature, options) => {
      strategies.push(options.strategy);
      return { context: { slot: 1 }, value: { err: null } };
    },
  };

  await transactionBuilder()
    .add(transferSol(umi))
    .confirm(umi, new Uint8Array(64));
  t.deepEqual(strategies, [
    { type: 'blockhash', blockhash: MOCK_BLOCKHASH, lastValidBlockHeight: 42 },
  ]);
});

test('it can send and confirm a transaction', async (t) => {
  const history = { sent: [] as Transaction[], confirmed: [] as Uint8Array[] };
  const umi = createMockUmi(history);
  const { signature, result } = await transactionBuilder()
    .add(transferSol(umi))
    .sendAndConfirm(umi);

  t.is(history.sent.length, 1);
  t.deepEqual(signature, history.sent[0].signatures[0]);
  t.deepEqual(history.confirmed, [signature]);
  t.deepEqual(result, { context: { slot: 123 }, value: { err: null } });
});

import test from 'ava';
import {
  RpcConfirmTransactionStrategy,
  Transaction,
  TransactionBuilder,
  transactionBuilder,
  transactionBuilderGroup,
} from '../src';
import {
  MOCK_BLOCKHASH,
  createMockUmi,
  mockInstruction,
  transferSol,
} from './_setup';

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

test('it starts empty and can add, append and prepend builders', (t) => {
  const builderA = transactionBuilder().add(mockInstruction());
  const builderB = transactionBuilder().add(mockInstruction());
  const builderC = transactionBuilder().add(mockInstruction());

  const group = transactionBuilderGroup();
  t.deepEqual(group.builders, []);

  const appended = group.add(builderA).append([builderB]);
  t.deepEqual(appended.builders, [builderA, builderB]);

  const prepended = appended.prepend(builderC);
  t.deepEqual(prepended.builders, [builderC, builderA, builderB]);

  const prependedMany = appended.prepend([builderC, builderA]);
  t.deepEqual(prependedMany.builders, [builderC, builderA, builderA, builderB]);
});

test('it is sequential by default and can toggle parallelism', (t) => {
  const group = transactionBuilderGroup();
  t.false(group.isParallel());
  t.true(group.parallel().isParallel());
  t.false(group.parallel().sequential().isParallel());
});

test('it can merge all builders into one', (t) => {
  const ixA = mockInstruction();
  const ixB = mockInstruction();
  const ixC = mockInstruction();
  const group = transactionBuilderGroup([
    transactionBuilder().add(ixA).setVersion('legacy'),
    transactionBuilder().add(ixB).add(ixC),
  ]);

  const merged = group.merge();
  t.deepEqual(merged.items, [ixA, ixB, ixC]);
  // The merged builder keeps the options of the first builder.
  t.is(merged.options.version, 'legacy');
});

test('merging an empty group returns an empty builder', (t) => {
  const merged = transactionBuilderGroup().merge();
  t.true(merged instanceof TransactionBuilder);
  t.deepEqual(merged.items, []);
});

test('it can map and filter its builders', (t) => {
  const builderA = transactionBuilder().add(mockInstruction());
  const builderB = transactionBuilder();
  const group = transactionBuilderGroup([builderA, builderB]);

  const filtered = group.filter((builder) => builder.items.length > 0);
  t.deepEqual(filtered.builders, [builderA]);

  const mapped = group.map((builder) => builder.setVersion('legacy'));
  t.true(mapped.builders.every((b) => b.options.version === 'legacy'));
});

test('it can build all transactions', (t) => {
  const umi = createMockUmi();
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)).setBlockhash('BlockhashA'),
    transactionBuilder().add(transferSol(umi)).setBlockhash('BlockhashB'),
  ]);

  const transactions = group.build(umi);
  t.is(transactions.length, 2);
  t.is(transactions[0].message.blockhash, 'BlockhashA');
  t.is(transactions[1].message.blockhash, 'BlockhashB');
});

test('it sets the latest blockhash only on blockhashless builders', async (t) => {
  const umi = createMockUmi();
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)).setBlockhash('ExistingHash'),
    transactionBuilder().add(transferSol(umi)),
  ]);

  const withBlockhash = await group.setLatestBlockhash(umi);
  t.is(withBlockhash.builders[0].getBlockhash(), 'ExistingHash');
  t.is(withBlockhash.builders[1].getBlockhash(), MOCK_BLOCKHASH);
});

test('it returns the same group when all builders have a blockhash', async (t) => {
  const umi = createMockUmi();
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)).setBlockhash('ExistingHash'),
  ]);
  t.is(await group.setLatestBlockhash(umi), group);
});

test('it can build all transactions using the latest blockhash', async (t) => {
  const umi = createMockUmi();
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)),
    transactionBuilder().add(transferSol(umi)),
  ]);

  const transactions = await group.buildWithLatestBlockhash(umi);
  t.is(transactions.length, 2);
  transactions.forEach((transaction) => {
    t.is(transaction.message.blockhash, MOCK_BLOCKHASH);
  });
});

test('it can build and sign all transactions', async (t) => {
  const umi = createMockUmi();
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)),
    transactionBuilder().add(transferSol(umi)),
  ]);

  const transactions = await group.buildAndSign(umi);
  t.is(transactions.length, 2);
  transactions.forEach((transaction) => {
    transaction.signatures.forEach((signature) => {
      t.false(signature.every((byte) => byte === 0));
    });
  });
});

test('it can send all transactions', async (t) => {
  const history = { sent: [] as Transaction[], confirmed: [] as Uint8Array[] };
  const umi = createMockUmi(history);
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)),
    transactionBuilder().add(transferSol(umi)),
  ]);

  const signatures = await group.send(umi);
  t.is(signatures.length, 2);
  t.is(history.sent.length, 2);
  t.deepEqual(signatures[0], history.sent[0].signatures[0]);
  t.deepEqual(signatures[1], history.sent[1].signatures[0]);
});

test('it can send and confirm all transactions', async (t) => {
  const history = { sent: [] as Transaction[], confirmed: [] as Uint8Array[] };
  const umi = createMockUmi(history);
  const group = transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)),
    transactionBuilder().add(transferSol(umi)),
  ]);

  const results = await group.sendAndConfirm(umi);
  t.is(results.length, 2);
  t.is(history.sent.length, 2);
  t.is(history.confirmed.length, 2);
  results.forEach((item, index) => {
    t.deepEqual(item.signature, history.sent[index].signatures[0]);
    t.deepEqual(item.result, { context: { slot: 123 }, value: { err: null } });
  });
});

test('sendAndConfirm reuses a builder blockhash for its confirm strategy', async (t) => {
  const umi = createMockUmi();
  const strategies: RpcConfirmTransactionStrategy[] = [];
  const baseRpc = umi.rpc;
  umi.rpc = {
    ...baseRpc,
    confirmTransaction: async (signature, options) => {
      strategies.push(options.strategy);
      return { context: { slot: 1 }, value: { err: null } };
    },
  };

  await transactionBuilderGroup([
    transactionBuilder()
      .add(transferSol(umi))
      .setBlockhash({ blockhash: 'GroupHash', lastValidBlockHeight: 7 }),
  ]).sendAndConfirm(umi);

  t.deepEqual(strategies, [
    { type: 'blockhash', blockhash: 'GroupHash', lastValidBlockHeight: 7 },
  ]);
});

test('sendAndConfirm can use an explicit confirm strategy', async (t) => {
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
    type: 'blockhash',
    blockhash: 'ExplicitHash',
    lastValidBlockHeight: 1,
  };
  await transactionBuilderGroup([
    transactionBuilder().add(transferSol(umi)),
  ]).sendAndConfirm(umi, { confirm: { strategy } });

  t.deepEqual(strategies, [strategy]);
});

test('runAll runs sequentially by default', async (t) => {
  const completed: number[] = [];
  await transactionBuilderGroup().runAll([1, 2, 3], async (item) => {
    // The first item is the slowest. Sequential runs still
    // complete it first because each item awaits the previous one.
    await delay(item === 1 ? 30 : 0);
    completed.push(item);
    return item;
  });
  t.deepEqual(completed, [1, 2, 3]);
});

test('runAll runs in parallel when the group is parallel', async (t) => {
  const completed: number[] = [];
  const results = await transactionBuilderGroup()
    .parallel()
    .runAll([1, 2, 3], async (item) => {
      await delay(item === 1 ? 30 : 0);
      completed.push(item);
      return item;
    });
  // The slow first item completes last, proving parallelism,
  // yet results remain in input order.
  t.deepEqual(completed, [2, 3, 1]);
  t.deepEqual(results, [1, 2, 3]);
});

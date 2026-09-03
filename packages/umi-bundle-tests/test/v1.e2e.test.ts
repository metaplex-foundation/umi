import {
  generateSigner,
  lamports,
  publicKey,
  RpcSimulateTransactionResult,
  transactionBuilder,
  TRANSACTION_SIZE_LIMIT,
  TRANSACTION_V1_SIZE_LIMIT,
  TransactionVersion,
  Umi,
  WrappedInstruction,
} from '@metaplex-foundation/umi';
import { struct, u32, u64, u8 } from '@metaplex-foundation/umi/serializers';
import test from 'ava';
import { createUmi } from '../src';

const SYSTEM_PROGRAM = publicKey('11111111111111111111111111111111');
const COMPUTE_BUDGET_PROGRAM = publicKey(
  'ComputeBudget111111111111111111111111111111'
);
const SET_COMPUTE_UNIT_LIMIT = 2;
const SET_COMPUTE_UNIT_PRICE = 3;
const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000n;

type NodeVersion = { 'solana-core': string; 'surfnet-version'?: string };

const transferSol = (umi: Umi, lamports: number): WrappedInstruction => ({
  instruction: {
    programId: SYSTEM_PROGRAM,
    keys: [
      { pubkey: umi.identity.publicKey, isSigner: true, isWritable: true },
      {
        pubkey: generateSigner(umi).publicKey,
        isSigner: false,
        isWritable: true,
      },
    ],
    data: struct([
      ['discriminator', u32()],
      ['lamports', u64()],
    ]).serialize({ discriminator: 2, lamports }),
  },
  signers: [umi.identity],
  bytesCreatedOnChain: 0,
});

const transfers = (umi: Umi, count: number): WrappedInstruction[] =>
  Array.from({ length: count }, (_, i) => transferSol(umi, 1_000_000 + i));

const computeBudgetInstruction = (
  discriminator: number,
  value: Uint8Array
): WrappedInstruction => ({
  instruction: {
    programId: COMPUTE_BUDGET_PROGRAM,
    keys: [],
    data: new Uint8Array([...u8().serialize(discriminator), ...value]),
  },
  signers: [],
  bytesCreatedOnChain: 0,
});

const isAtLeast = (version: string | undefined, minimum: number[]): boolean => {
  if (version === undefined) return false;
  const parts = version.split(/[.-]/, minimum.length).map(Number);
  const difference =
    parts.map((part, i) => part - minimum[i]).find((diff) => diff !== 0) ?? 0;
  return difference >= 0;
};

/**
 * Per the support table at solana.com/upgrades/larger-transaction-sizes:
 * Surfpool 1.5 or Agave 4.2.
 */
const supportsV1 = (version: NodeVersion): boolean =>
  isAtLeast(version['surfnet-version'], [1, 5, 0]) ||
  isAtLeast(version['solana-core'], [4, 2, 0]);

const nodeSupportsV1 = async (umi: Umi): Promise<boolean> =>
  supportsV1(await umi.rpc.call<NodeVersion>('getVersion', []));

const simulateProbe = async (
  umi: Umi
): Promise<RpcSimulateTransactionResult> => {
  const simulation = await umi.rpc.simulateTransaction(
    await transactionBuilder()
      .add(transferSol(umi, 1_000_000))
      .useV1()
      .buildAndSign(umi)
  );
  if (simulation.err !== null) {
    throw new Error(
      `The V1 probe simulation failed: ${JSON.stringify(simulation.err)}`
    );
  }
  return simulation;
};

test('it still reads back legacy and V0 transactions', async (t) => {
  t.timeout(60_000);
  const umi = await createUmi();
  const versions: TransactionVersion[] = ['legacy', 0];

  await Promise.all(
    versions.map(async (version) => {
      const { signature } = await transactionBuilder()
        .add(transferSol(umi, 1_000_000))
        .setVersion(version)
        .sendAndConfirm(umi);
      const fetched = await umi.rpc.getTransaction(signature);
      if (!fetched) {
        t.fail(`the confirmed ${version} transaction could not be fetched`);
        return;
      }
      t.is(fetched.message.version, version);
      t.is(fetched.response.version, version);
      t.false('transactionConfig' in fetched.message);
      t.is(fetched.meta.err, null);
      t.is(fetched.meta.preBalances.length, fetched.message.accounts.length);
      t.true(fetched.meta.logs.length > 0);
    })
  );
});

test('it sends, confirms and reads back a V1 transaction larger than 1232 bytes', async (t) => {
  t.timeout(60_000);
  const umi = await createUmi();
  if (!(await nodeSupportsV1(umi))) {
    t.log('the node does not support V1 transactions, skipping');
    t.pass();
    return;
  }
  const probe = await simulateProbe(umi);
  t.is(typeof probe.unitsConsumed, 'number');
  t.is(typeof probe.loadedAccountsDataSize, 'number');

  const builder = await transactionBuilder()
    .add(transfers(umi, 40))
    .useV1()
    .setLatestBlockhash(umi);
  const transaction = await builder.buildAndSign(umi);
  const wire = umi.transactions.serialize(transaction);
  t.true(wire.length > TRANSACTION_SIZE_LIMIT);
  t.true(wire.length <= TRANSACTION_V1_SIZE_LIMIT);

  const signature = await umi.rpc.sendTransaction(transaction);
  const confirmation = await builder.confirm(umi, signature);
  t.is(confirmation.value.err, null);

  const fetched = await umi.rpc.getTransaction(signature);
  if (!fetched) {
    t.fail('the confirmed transaction could not be fetched');
    return;
  }
  t.deepEqual(fetched.serializedMessage, transaction.serializedMessage);
  t.deepEqual(fetched.signatures, transaction.signatures);
  t.is(fetched.message.version, 1);
  t.deepEqual(fetched.message.transactionConfig, {
    computeUnitLimit: 1_400_000,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
  });
  t.is(fetched.response.version, 1);
  t.is(fetched.meta.err, null);
  t.is(typeof fetched.meta.computeUnitsConsumed, 'bigint');
  t.is(fetched.meta.preBalances.length, fetched.message.accounts.length);
  t.log({
    wireLength: wire.length,
    probeUnitsConsumed: probe.unitsConsumed,
    probeLoadedAccountsDataSize: probe.loadedAccountsDataSize,
    computeUnitsConsumed: fetched.meta.computeUnitsConsumed,
    slot: fetched.response.slot,
  });
});

test('it folds ComputeBudget instructions into the config of a V1 transaction', async (t) => {
  t.timeout(60_000);
  const umi = await createUmi();
  if (!(await nodeSupportsV1(umi))) {
    t.log('the node does not support V1 transactions, skipping');
    t.pass();
    return;
  }

  const computeUnitLimit = 50_000;
  const computeUnitPrice = 1_000n;
  const builder = transactionBuilder()
    .add(
      computeBudgetInstruction(
        SET_COMPUTE_UNIT_LIMIT,
        u32().serialize(computeUnitLimit)
      )
    )
    .add(
      computeBudgetInstruction(
        SET_COMPUTE_UNIT_PRICE,
        u64().serialize(computeUnitPrice)
      )
    )
    .add(transferSol(umi, 1_000_000))
    .useV1();
  const { signature, result } = await builder.sendAndConfirm(umi);
  t.is(result.value.err, null);

  const fetched = await umi.rpc.getTransaction(signature);
  if (!fetched) {
    t.fail('the confirmed transaction could not be fetched');
    return;
  }
  t.is(fetched.message.instructions.length, 1);
  t.false(fetched.message.accounts.includes(COMPUTE_BUDGET_PROGRAM));
  t.deepEqual(fetched.message.transactionConfig, {
    computeUnitLimit,
    loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    priorityFee: lamports(
      (computeUnitPrice * BigInt(computeUnitLimit) +
        MICRO_LAMPORTS_PER_LAMPORT -
        1n) /
        MICRO_LAMPORTS_PER_LAMPORT
    ),
  });
  t.is(fetched.meta.err, null);
  t.log({
    computeUnitLimit: fetched.message.transactionConfig?.computeUnitLimit,
    priorityFee: fetched.message.transactionConfig?.priorityFee,
    fee: fetched.meta.fee,
    computeUnitsConsumed: fetched.meta.computeUnitsConsumed,
  });
});

test('it estimates the compute budget of a V1 transaction by simulation', async (t) => {
  t.timeout(60_000);
  const umi = await createUmi();
  if (!(await nodeSupportsV1(umi))) {
    t.log('the node does not support V1 transactions, skipping');
    t.pass();
    return;
  }

  const builder = await transactionBuilder()
    .add(transfers(umi, 40))
    .setEstimatedTransactionConfig(umi);
  const { transactionConfig } = builder.options;
  if (!transactionConfig?.computeUnitLimit) {
    t.fail('the compute unit limit was not estimated');
    return;
  }
  t.is(builder.getVersion(), 1);
  t.true(transactionConfig.computeUnitLimit < 1_400_000);
  t.is(transactionConfig.loadedAccountsDataSizeLimit, 32 * 1024);

  const { signature, result } = await builder.sendAndConfirm(umi);
  t.is(result.value.err, null);

  const fetched = await umi.rpc.getTransaction(signature);
  if (!fetched?.meta.computeUnitsConsumed) {
    t.fail('the confirmed transaction could not be fetched');
    return;
  }
  t.deepEqual(fetched.message.transactionConfig, transactionConfig);
  t.true(
    fetched.meta.computeUnitsConsumed <=
      BigInt(transactionConfig.computeUnitLimit)
  );
  t.log({
    estimatedTransactionConfig: transactionConfig,
    computeUnitsConsumed: fetched.meta.computeUnitsConsumed,
  });
});

test('it splits a V1 builder that exceeds the account limit', async (t) => {
  t.timeout(120_000);
  const umi = await createUmi();
  if (!(await nodeSupportsV1(umi))) {
    t.log('the node does not support V1 transactions, skipping');
    t.pass();
    return;
  }

  const seventyRecipients = transactionBuilder()
    .add(transfers(umi, 70))
    .useV1();
  t.false(seventyRecipients.fitsInOneTransaction(umi));

  const builders = seventyRecipients.unsafeSplitByTransactionSize(umi);
  t.is(builders.length, 2);
  t.is(builders[0].items.length + builders[1].items.length, 70);
  builders.forEach((builder) => t.true(builder.fitsInOneTransaction(umi)));
  t.true(builders[0].getTransactionSize(umi) > TRANSACTION_SIZE_LIMIT);

  const results = await Promise.all(
    builders.map((builder) => builder.sendAndConfirm(umi))
  );
  results.forEach(({ result }) => t.is(result.value.err, null));
  t.log({
    chunkSizes: builders.map((builder) => builder.items.length),
    chunkBytes: builders.map((builder) => builder.getTransactionSize(umi)),
  });
});

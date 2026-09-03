import test from 'ava';
import {
  assertValidTransactionConfigInput,
  estimateTransactionConfig,
  foldComputeBudgetInstructions,
  Instruction,
  publicKey,
  SdkError,
  TRANSACTION_CONFIG_MAX,
} from '../src';
import { u32, u64, u8 } from '../src/serializers';

const simulation = {
  err: null,
  unitsConsumed: 6000,
  loadedAccountsDataSize: 14,
};

const COMPUTE_BUDGET_PROGRAM = publicKey(
  'ComputeBudget111111111111111111111111111111'
);

const computeBudgetInstruction = (
  discriminator: number,
  value: Uint8Array
): Instruction => ({
  programId: COMPUTE_BUDGET_PROGRAM,
  keys: [],
  data: new Uint8Array([...u8().serialize(discriminator), ...value]),
});

const transfer: Instruction = {
  programId: publicKey('11111111111111111111111111111111'),
  keys: [],
  data: new Uint8Array([2, 0, 0, 0]),
};

test('it estimates the compute budget from a simulation', (t) => {
  t.deepEqual(estimateTransactionConfig(simulation), {
    computeUnitLimit: 6600,
    loadedAccountsDataSizeLimit: 32_768,
  });
});

test('it applies the compute unit margin and caps the limit', (t) => {
  const estimate = (unitsConsumed: number, computeUnitMargin?: number) =>
    estimateTransactionConfig(
      { ...simulation, unitsConsumed },
      { computeUnitMargin }
    ).computeUnitLimit;

  t.is(estimate(6000, 0), 6000);
  t.is(estimate(6000, 0.5), 9000);
  t.is(estimate(1001, 0.1), 1102);
  t.is(estimate(1_399_999), TRANSACTION_CONFIG_MAX.computeUnitLimit);
});

test('it rounds the loaded accounts data size up to 32KiB pages', (t) => {
  const estimate = (loadedAccountsDataSize: number) =>
    estimateTransactionConfig({ ...simulation, loadedAccountsDataSize })
      .loadedAccountsDataSizeLimit;

  t.is(estimate(0), 32_768);
  t.is(estimate(32_768), 32_768);
  t.is(estimate(32_769), 65_536);
  t.is(estimate(1_000_000), 1_015_808);
});

test('it refuses a negative compute unit margin', (t) => {
  t.throws(
    () => estimateTransactionConfig(simulation, { computeUnitMargin: -0.5 }),
    { instanceOf: SdkError, message: /cannot be negative/ }
  );
});

test('it refuses failed or incomplete simulations', (t) => {
  t.throws(
    () => estimateTransactionConfig({ ...simulation, err: 'AccountNotFound' }),
    { instanceOf: SdkError, message: /AccountNotFound.*TRANSACTION_CONFIG_MAX/ }
  );
  t.throws(
    () =>
      estimateTransactionConfig({ ...simulation, unitsConsumed: undefined }),
    { instanceOf: SdkError, message: /does not support V1/ }
  );
  t.throws(
    () =>
      estimateTransactionConfig({
        ...simulation,
        loadedAccountsDataSize: undefined,
      }),
    { instanceOf: SdkError, message: /does not support V1/ }
  );
});

test('it requires both limits and a valid heap size to create a V1 transaction', (t) => {
  t.notThrows(() => assertValidTransactionConfigInput(TRANSACTION_CONFIG_MAX));
  [32 * 1024, 256 * 1024].forEach((heapSize) => {
    t.notThrows(() =>
      assertValidTransactionConfigInput({ ...TRANSACTION_CONFIG_MAX, heapSize })
    );
  });

  t.throws(
    () => assertValidTransactionConfigInput({ loadedAccountsDataSizeLimit: 1 }),
    {
      instanceOf: SdkError,
      message: /finite computeUnitLimit but got undefined/,
    }
  );
  t.throws(
    () =>
      assertValidTransactionConfigInput({
        computeUnitLimit: 1,
        loadedAccountsDataSizeLimit: undefined,
      }),
    {
      instanceOf: SdkError,
      message: /finite loadedAccountsDataSizeLimit but got undefined/,
    }
  );
  t.throws(
    () =>
      assertValidTransactionConfigInput({
        ...TRANSACTION_CONFIG_MAX,
        computeUnitLimit: Number.NaN,
      }),
    { instanceOf: SdkError, message: /finite computeUnitLimit but got NaN/ }
  );
  [31 * 1024, 257 * 1024, 32 * 1024 + 1].forEach((heapSize) => {
    t.throws(
      () =>
        assertValidTransactionConfigInput({
          ...TRANSACTION_CONFIG_MAX,
          heapSize,
        }),
      { instanceOf: SdkError, message: /heap size/ }
    );
  });
});

test('it folds ComputeBudget instructions into a transaction config', (t) => {
  const folded = foldComputeBudgetInstructions([
    computeBudgetInstruction(2, u32().serialize(50_000)),
    computeBudgetInstruction(3, u64().serialize(1_000)),
    transfer,
    computeBudgetInstruction(1, u32().serialize(65_536)),
    computeBudgetInstruction(4, u32().serialize(98_304)),
  ]);

  t.deepEqual(folded, {
    instructions: [transfer],
    transactionConfig: {
      computeUnitLimit: 50_000,
      heapSize: 65_536,
      loadedAccountsDataSizeLimit: 98_304,
    },
    computeUnitPrice: 1_000n,
  });
});

test('it keeps unknown ComputeBudget instructions and other programs as they are', (t) => {
  const unknown = computeBudgetInstruction(9, u32().serialize(1));
  const deprecated = computeBudgetInstruction(0, u32().serialize(1));
  const folded = foldComputeBudgetInstructions([unknown, transfer, deprecated]);

  t.deepEqual(folded, {
    instructions: [unknown, transfer, deprecated],
    transactionConfig: {},
    computeUnitPrice: undefined,
  });
});

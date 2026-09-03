import { publicKey } from '@metaplex-foundation/umi-public-keys';
import { Serializer, u32, u64 } from '@metaplex-foundation/umi-serializers';
import type { SolAmount } from './Amount';
import { SdkError } from './errors';
import type { Instruction } from './Instruction';
import type { RpcSimulateTransactionResult } from './RpcInterface';

const LOADED_ACCOUNTS_DATA_SIZE_PAGE = 32 * 1024;

const COMPUTE_BUDGET_PROGRAM_ID = publicKey(
  'ComputeBudget111111111111111111111111111111'
);
const COMPUTE_BUDGET_REQUEST_HEAP_FRAME = 1;
const COMPUTE_BUDGET_SET_COMPUTE_UNIT_LIMIT = 2;
const COMPUTE_BUDGET_SET_COMPUTE_UNIT_PRICE = 3;
const COMPUTE_BUDGET_SET_LOADED_ACCOUNTS_DATA_SIZE_LIMIT = 4;

/**
 * The granularity of the heap size a V1 transaction may request.
 * @category Transactions
 */
export const TRANSACTION_V1_HEAP_SIZE_STEP = 1024;

/**
 * The smallest heap size a V1 transaction may request, which the runtime
 * also grants when the config sets none.
 * @category Transactions
 */
export const TRANSACTION_V1_MIN_HEAP_SIZE = 32 * 1024;

/**
 * The largest heap size a V1 transaction may request.
 * @category Transactions
 */
export const TRANSACTION_V1_MAX_HEAP_SIZE = 256 * 1024;

/**
 * The compute budget of a V1 transaction. It replaces the
 * ComputeBudget program instructions used by legacy and V0
 * transactions, which V1 transactions ignore.
 *
 * Beware that the runtime treats an unset `computeUnitLimit` or
 * `loadedAccountsDataSizeLimit` as zero, so a V1 transaction that
 * leaves them unset fails at execution.
 *
 * @category Transactions
 */
export type TransactionConfig = {
  /** The total priority fee to pay for the transaction. */
  priorityFee?: SolAmount;
  /** The maximum number of compute units the transaction may consume. At most 1,400,000. */
  computeUnitLimit?: number;
  /** The maximum number of bytes of account data the transaction may load. */
  loadedAccountsDataSizeLimit?: number;
  /** The requested heap size in bytes. A multiple of 1,024 between 32,768 and 262,144. */
  heapSize?: number;
};

/**
 * The compute budget a V1 transaction is created with. Both limits
 * the runtime requires are mandatory here so that no V1 transaction
 * can be created without them.
 *
 * @category Transactions
 */
export type TransactionConfigInput = TransactionConfig &
  Required<
    Pick<TransactionConfig, 'computeUnitLimit' | 'loadedAccountsDataSizeLimit'>
  >;

/**
 * The largest compute budget a V1 transaction can request.
 * Simulate with it to measure what a transaction actually needs.
 *
 * @category Transactions
 */
export const TRANSACTION_CONFIG_MAX: TransactionConfigInput = {
  computeUnitLimit: 1_400_000,
  loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
};

/**
 * Asserts that a compute budget can be compiled into a V1 message: both
 * limits the runtime requires are set and the heap size, when set, is a
 * multiple of 1KiB between 32KiB and 256KiB as SIMD-0385 demands.
 *
 * @category Transactions
 */
export function assertValidTransactionConfigInput(
  transactionConfig: TransactionConfig
): asserts transactionConfig is TransactionConfigInput {
  (['computeUnitLimit', 'loadedAccountsDataSizeLimit'] as const).forEach(
    (limit) => {
      if (!Number.isFinite(transactionConfig[limit])) {
        throw new SdkError(
          `A V1 transaction requires a finite ${limit} but got ${transactionConfig[limit]}.`
        );
      }
    }
  );
  const { heapSize } = transactionConfig;
  if (
    heapSize !== undefined &&
    (heapSize % TRANSACTION_V1_HEAP_SIZE_STEP !== 0 ||
      heapSize < TRANSACTION_V1_MIN_HEAP_SIZE ||
      heapSize > TRANSACTION_V1_MAX_HEAP_SIZE)
  ) {
    throw new SdkError(
      `The heap size of a V1 transaction must be a multiple of ${TRANSACTION_V1_HEAP_SIZE_STEP} bytes ` +
        `between ${TRANSACTION_V1_MIN_HEAP_SIZE} and ${TRANSACTION_V1_MAX_HEAP_SIZE} but got ${heapSize}.`
    );
  }
}

/**
 * Splits the ComputeBudget program instructions out of the given
 * instructions and translates them into the compute budget of a V1
 * transaction, which ignores such instructions. The compute unit price
 * is returned as requested, in micro-lamports per compute unit, because
 * the priority fee it amounts to depends on the final compute unit limit.
 * ComputeBudget instructions the program itself would reject are kept.
 *
 * @category Transactions
 */
export function foldComputeBudgetInstructions(instructions: Instruction[]): {
  instructions: Instruction[];
  transactionConfig: TransactionConfig;
  computeUnitPrice?: bigint;
} {
  const transactionConfig: TransactionConfig = {};
  let computeUnitPrice: bigint | undefined;
  const otherInstructions = instructions.filter((instruction) => {
    if (instruction.programId !== COMPUTE_BUDGET_PROGRAM_ID) return true;
    const [discriminator] = instruction.data;
    const value = <T>(serializer: Serializer<T>): T =>
      serializer.deserialize(instruction.data, 1)[0];
    switch (discriminator) {
      case COMPUTE_BUDGET_REQUEST_HEAP_FRAME:
        transactionConfig.heapSize = value(u32());
        return false;
      case COMPUTE_BUDGET_SET_COMPUTE_UNIT_LIMIT:
        transactionConfig.computeUnitLimit = value(u32());
        return false;
      case COMPUTE_BUDGET_SET_COMPUTE_UNIT_PRICE:
        computeUnitPrice = value(u64());
        return false;
      case COMPUTE_BUDGET_SET_LOADED_ACCOUNTS_DATA_SIZE_LIMIT:
        transactionConfig.loadedAccountsDataSizeLimit = value(u32());
        return false;
      default:
        return true;
    }
  });
  return {
    instructions: otherInstructions,
    transactionConfig,
    computeUnitPrice,
  };
}

/**
 * Estimates the compute budget a V1 transaction needs from a simulation
 * run with {@link TRANSACTION_CONFIG_MAX}: the consumed compute units
 * plus a margin (10% by default) and the loaded account data rounded up
 * to the next 32KiB page.
 *
 * @category Transactions
 */
export function estimateTransactionConfig(
  simulation: Pick<
    RpcSimulateTransactionResult,
    'err' | 'unitsConsumed' | 'loadedAccountsDataSize'
  >,
  options: { computeUnitMargin?: number } = {}
): Pick<
  TransactionConfigInput,
  'computeUnitLimit' | 'loadedAccountsDataSizeLimit'
> {
  const { computeUnitMargin = 0.1 } = options;
  if (computeUnitMargin < 0) {
    throw new SdkError(
      `The compute unit margin cannot be negative but got ${computeUnitMargin}.`
    );
  }
  if (simulation.err !== null) {
    throw new SdkError(
      'Cannot estimate the transaction config from a failed simulation: ' +
        `${JSON.stringify(simulation.err)}. Fix the transaction or use ` +
        'TRANSACTION_CONFIG_MAX.'
    );
  }
  if (
    simulation.unitsConsumed === undefined ||
    simulation.loadedAccountsDataSize === undefined
  ) {
    throw new SdkError(
      'The simulation reported no unitsConsumed or loadedAccountsDataSize, ' +
        'so the node likely does not support V1 transactions. ' +
        'Use TRANSACTION_CONFIG_MAX instead.'
    );
  }
  // Rounding to a millionth first keeps floating point noise such as
  // 6000 * 1.1 = 6600.000000000001 from costing an extra compute unit.
  const computeUnits =
    Math.round(simulation.unitsConsumed * (1 + computeUnitMargin) * 1e6) / 1e6;
  return {
    computeUnitLimit: Math.min(
      Math.ceil(computeUnits),
      TRANSACTION_CONFIG_MAX.computeUnitLimit
    ),
    loadedAccountsDataSizeLimit: Math.max(
      Math.ceil(
        simulation.loadedAccountsDataSize / LOADED_ACCOUNTS_DATA_SIZE_PAGE
      ) * LOADED_ACCOUNTS_DATA_SIZE_PAGE,
      LOADED_ACCOUNTS_DATA_SIZE_PAGE
    ),
  };
}

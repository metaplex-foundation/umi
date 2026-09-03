import { PublicKey } from '@metaplex-foundation/umi-public-keys';
import { Amount, SolAmount } from './Amount';
import { SdkError } from './errors';
import type { Instruction } from './Instruction';
import type { Commitment } from './RpcInterface';
import type {
  TransactionConfig,
  TransactionConfigInput,
} from './TransactionConfig';

/**
 * The maximum amount of bytes that can be used for a legacy or V0 transaction.
 * @category Transactions
 */
export const TRANSACTION_SIZE_LIMIT = 1232;

/**
 * The maximum amount of bytes that can be used for a V1 transaction.
 * @category Transactions
 */
export const TRANSACTION_V1_SIZE_LIMIT = 4096;

/**
 * The maximum number of accounts a V1 transaction can reference.
 * @category Transactions
 */
export const TRANSACTION_V1_MAX_ACCOUNTS = 64;

/**
 * The maximum number of instructions a V1 transaction can contain.
 * @category Transactions
 */
export const TRANSACTION_V1_MAX_INSTRUCTIONS = 64;

/**
 * The maximum number of signatures a V1 transaction can require.
 * @category Transactions
 */
export const TRANSACTION_V1_MAX_SIGNATURES = 12;

/**
 * The version of a transaction.
 * - Legacy is the very first iteration of Solana transactions.
 * - V0 introduces the concept of versioned transaction for
 * the first time and adds supports for address lookup tables.
 * - V1 raises the size limit to 4096 bytes and moves the compute
 * budget into the message itself (see {@link TransactionConfig})
 * but does not support address lookup tables. See SIMD-0385.
 *
 * @category Transactions
 */
export type TransactionVersion = 'legacy' | 0 | 1;

/**
 * The highest transaction version Umi can decode, as sent to the RPC
 * when fetching transactions or blocks.
 * @category Transactions
 */
export const MAX_SUPPORTED_TRANSACTION_VERSION: Extract<
  TransactionVersion,
  number
> = 1;

/**
 * The maximum amount of bytes that can be used for a
 * transaction of the given version.
 * @category Transactions
 */
export function getTransactionSizeLimit(version: TransactionVersion): number {
  switch (version) {
    case 'legacy':
    case 0:
      return TRANSACTION_SIZE_LIMIT;
    case 1:
      return TRANSACTION_V1_SIZE_LIMIT;
    default: {
      const never: never = version;
      throw new SdkError(`Unsupported transaction version: ${never}.`);
    }
  }
}

/**
 * A Uint8Array that represents a serialized transaction.
 * @category Transactions
 */
export type SerializedTransaction = Uint8Array;

/**
 * A Uint8Array that represents the serialized message of a transaction.
 * @category Transactions
 */
export type SerializedTransactionMessage = Uint8Array;

/**
 * A Uint8Array that represents a transaction signature.
 * @category Transactions
 */
export type TransactionSignature = Uint8Array;

/**
 * Defines a transaction error.
 * @category Transactions
 */
export type TransactionError = {} | string;

/**
 * Defines a blockhash.
 * @category Transactions
 */
export type Blockhash = string;

/**
 * Defines a blockhash with its expiry block height.
 * @category Transactions
 */
export type BlockhashWithExpiryBlockHeight = {
  blockhash: Blockhash;
  lastValidBlockHeight: number;
};

/**
 * Defines a transaction.
 * @category Transactions
 */
export interface Transaction {
  readonly message: TransactionMessage;
  readonly serializedMessage: SerializedTransactionMessage;
  readonly signatures: TransactionSignature[];
}

/**
 * Defines the message of a transaction.
 * @category Transactions
 */
export interface TransactionMessage {
  readonly version: TransactionVersion;
  readonly header: TransactionMessageHeader;
  readonly accounts: PublicKey[];
  readonly blockhash: Blockhash;
  readonly instructions: CompiledInstruction[];
  readonly addressLookupTables: CompiledAddressLookupTable[];
  /** The compute budget of the transaction. Only set on V1 messages. */
  readonly transactionConfig?: TransactionConfig;
}

/**
 * Defines the header of a transaction message.
 * @category Transactions
 */
export type TransactionMessageHeader = {
  readonly numRequiredSignatures: number;
  readonly numReadonlySignedAccounts: number;
  readonly numReadonlyUnsignedAccounts: number;
};

/**
 * Defines an instruction that uses indexes to reference accounts.
 * @category Transactions
 */
export type CompiledInstruction = {
  readonly programIndex: number;
  readonly accountIndexes: number[];
  readonly data: Uint8Array;
};

/**
 * Defines an address lookup table that uses indexes to reference accounts.
 * @category Transactions
 */
export type CompiledAddressLookupTable = {
  readonly publicKey: PublicKey;
  readonly writableIndexes: number[];
  readonly readonlyIndexes: number[];
};

/**
 * Defines a transaction with its post-execution metadata.
 * @category Transactions
 */
export type TransactionWithMeta = Transaction & {
  readonly meta: TransactionMeta;
};

/**
 * Defines the post-execution metadata of a transaction.
 * @category Transactions
 */
export type TransactionMeta = {
  readonly fee: SolAmount;
  readonly logs: string[];
  readonly preBalances: SolAmount[];
  readonly postBalances: SolAmount[];
  readonly preTokenBalances: TransactionMetaTokenBalance[];
  readonly postTokenBalances: TransactionMetaTokenBalance[];
  readonly innerInstructions: TransactionMetaInnerInstruction[] | null;
  readonly loadedAddresses: TransactionMetaLoadedAddresses;
  readonly computeUnitsConsumed: bigint | null;
  readonly costUnits: bigint | null;
  readonly err: TransactionError | null;
};

/**
 * The balance of a token account before or after a transaction.
 * @category Transactions
 */
export type TransactionMetaTokenBalance = {
  accountIndex: number;
  amount: Amount;
  mint: PublicKey;
  owner: PublicKey | null;
};

/**
 * The cross program invoked instructions of an instruction.
 * @category Transactions
 */
export type TransactionMetaInnerInstruction = {
  index: number;
  instructions: CompiledInstruction[];
};

/**
 * The collection of addresses loaded using address lookup tables.
 * @category Transactions
 */
export type TransactionMetaLoadedAddresses = {
  writable: PublicKey[];
  readonly: PublicKey[];
};

/**
 * Defines the various ways to create a transaction.
 * @category Transactions
 */
export type TransactionInput =
  | TransactionInputLegacy
  | TransactionInputV0
  | TransactionInputV1;

/**
 * Defines transaction input for legacy transactions.
 * @category Transactions
 */
export type TransactionInputLegacy = TransactionInputBase & {
  version: 'legacy';
  addressLookupTables?: never;
  transactionConfig?: never;
};

/**
 * Defines transaction input for V0 transactions.
 * @category Transactions
 */
export type TransactionInputV0 = TransactionInputBase & {
  version?: 0;
  addressLookupTables?: AddressLookupTableInput[];
  transactionConfig?: never;
};

/**
 * Defines transaction input for V1 transactions.
 * @category Transactions
 */
export type TransactionInputV1 = TransactionInputBase & {
  version: 1;
  addressLookupTables?: never;
  transactionConfig: TransactionConfigInput;
};

/**
 * Defines common transaction input.
 * @category Transactions
 */
export type TransactionInputBase = {
  payer: PublicKey;
  instructions: Instruction[];
  blockhash: Blockhash;
  signatures?: TransactionSignature[];
};

/**
 * The required data to add an address lookup table to a transaction.
 * @category Transactions
 */
export type AddressLookupTableInput = {
  publicKey: PublicKey;
  addresses: PublicKey[];
};

/**
 * The status of a sent transaction.
 * @category Transactions
 */
export type TransactionStatus = {
  /** When the transaction was processed. */
  slot: number;
  /** The number of blocks that have been confirmed and voted on in the fork containing `slot`. */
  confirmations: number | null;
  /** The transaction error, if any. */
  error: TransactionError | null;
  /** The cluster confirmation status, if any. */
  commitment: Commitment | null;
};

/**
 * Adds a given signature to the transaction's signature array
 * and returns the updated transaction as a new object.
 *
 * @category Transactions
 */
export const addTransactionSignature = (
  transaction: Transaction,
  signature: TransactionSignature,
  signerPublicKey: PublicKey
): Transaction => {
  const maxSigners = transaction.message.header.numRequiredSignatures;
  const signerPublicKeys = transaction.message.accounts.slice(0, maxSigners);
  const signerIndex = signerPublicKeys.findIndex(
    (key) => key === signerPublicKey
  );

  if (signerIndex < 0) {
    throw new Error(
      'The provided signer is not required to sign this transaction.'
    );
  }

  const newSignatures = [...transaction.signatures];
  newSignatures[signerIndex] = signature;
  return { ...transaction, signatures: newSignatures };
};

import { Amount, SolAmount } from './Amount';
import type { Instruction } from './Instruction';
import { samePublicKey, PublicKey } from './PublicKey';

export const TRANSACTION_SIZE_LIMIT = 1232;

export type TransactionVersion = 'legacy' | 0;
export type SerializedTransaction = Uint8Array;
export type SerializedTransactionMessage = Uint8Array;
export type TransactionSignature = Uint8Array;
export type TransactionError = {} | string;
export type Blockhash = string;
export type BlockhashWithExpiryBlockHeight = {
  blockhash: Blockhash;
  lastValidBlockHeight: number;
};

export interface Transaction {
  readonly message: TransactionMessage;
  readonly serializedMessage: SerializedTransactionMessage;
  readonly signatures: TransactionSignature[];
}

export interface TransactionMessage {
  readonly version: TransactionVersion;
  readonly header: TransactionMessageHeader;
  readonly accounts: PublicKey[];
  readonly blockhash: Blockhash;
  readonly instructions: CompiledInstruction[];
  readonly addressLookupTables: CompiledAddressLookupTable[];
}

export type TransactionMessageHeader = {
  readonly numRequiredSignatures: number;
  readonly numReadonlySignedAccounts: number;
  readonly numReadonlyUnsignedAccounts: number;
};

export type CompiledInstruction = {
  readonly programIndex: number;
  readonly accountIndexes: number[];
  readonly data: Uint8Array;
};

export type CompiledAddressLookupTable = {
  readonly publicKey: PublicKey;
  readonly writableIndexes: number[];
  readonly readonlyIndexes: number[];
};

export type TransactionWithMeta = Transaction & {
  readonly meta: TransactionMeta;
};

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
  readonly err: TransactionError | null;
};

export type TransactionMetaTokenBalance = {
  accountIndex: number;
  amount: Amount;
  mint: PublicKey;
  owner: PublicKey | null;
};

export type TransactionMetaInnerInstruction = {
  index: number;
  instructions: CompiledInstruction[];
};

export type TransactionMetaLoadedAddresses = {
  writable: PublicKey[];
  readonly: PublicKey[];
};

export type TransactionInput = TransactionInputLegacy | TransactionInputV0;

export type TransactionInputLegacy = TransactionInputBase & {
  version: 'legacy';
};

export type TransactionInputV0 = TransactionInputBase & {
  version?: 0;
  addressLookupTables?: AddressLookupTableInput[];
};

export type TransactionInputBase = {
  payer: PublicKey;
  instructions: Instruction[];
  blockhash: Blockhash;
  signatures?: TransactionSignature[];
};

export type AddressLookupTableInput = {
  publicKey: PublicKey;
  addresses: PublicKey[];
};

export const addTransactionSignature = (
  transaction: Transaction,
  signature: TransactionSignature,
  signerPublicKey: PublicKey
): Transaction => {
  const maxSigners = transaction.message.header.numRequiredSignatures;
  const signerPublicKeys = transaction.message.accounts.slice(0, maxSigners);
  const signerIndex = signerPublicKeys.findIndex((key) =>
    samePublicKey(key, signerPublicKey)
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

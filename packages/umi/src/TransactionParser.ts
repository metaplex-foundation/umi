import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { Serializer } from '@metaplex-foundation/umi-serializers';
import type { ClusterFilter } from './Cluster';
import type { Context } from './Context';
import type { AccountMeta, Instruction } from './Instruction';
import type {
  Blockhash,
  CompiledAddressLookupTable,
  CompiledInstruction,
  Transaction,
  TransactionMessage,
  TransactionMessageHeader,
  TransactionMeta,
  TransactionMetaLoadedAddresses,
  TransactionSignature,
  TransactionVersion,
  TransactionWithMeta,
} from './Transaction';

/**
 * Defines the discriminator bytes used to identify an instruction.
 * @category Transaction Parser
 */
export type InstructionDiscriminator = {
  /** The raw discriminator bytes to match against. The discriminator occupies
   *  exactly `bytes.length` bytes at the start of the instruction data. */
  bytes: Uint8Array;
};

/**
 * Describes a program instruction that can be parsed from a transaction.
 * @category Transaction Parser
 */
export type InstructionDescriptor = {
  /** The name of the instruction (e.g. 'createMetadataAccountV3'). */
  name: string;
  /** The discriminator used to identify this instruction in raw data. */
  discriminator: InstructionDiscriminator;
  /** A serializer that can deserialize the instruction data after the discriminator. */
  dataSerializer: Serializer<any>;
  /** Optional human-readable names for each account, mapped positionally. */
  accountNames?: string[];
};

/**
 * An account from a parsed instruction with an optional human-readable name.
 * @category Transaction Parser
 */
export type ParsedAccountMeta = AccountMeta & {
  /** The human-readable name of the account, if registered. */
  name?: string;
};

/**
 * The outcome of parsing a single instruction.
 * @category Transaction Parser
 */
export type ParseStatus =
  /** The instruction was matched to a descriptor and its data was deserialized. */
  | 'parsed'
  /** The program is not registered in the repository. */
  | 'unknown-program'
  /** The program is registered but has no instruction descriptors. */
  | 'no-descriptors'
  /** The program is registered with descriptors but none matched the discriminator. */
  | 'no-discriminator-match'
  /** A descriptor matched but its data serializer threw while deserializing. */
  | 'deserialize-failed';

/**
 * A fully parsed instruction from a transaction.
 * @category Transaction Parser
 */
export type ParsedInstruction = {
  /** Zero-based position of this instruction within the transaction. */
  index: number;
  /** The registered name of the program, or 'unknown'. */
  programName: string;
  /** The public key of the program. */
  programId: PublicKey;
  /** The name of the instruction, or 'unknown'. */
  instructionName: string;
  /** Indicates how far parsing progressed and why it stopped. */
  status: ParseStatus;
  /** The deserialized instruction fields when {@link status} is `'parsed'`,
   *  otherwise `null`. Use {@link rawData} to access the original bytes. */
  data: Record<string, unknown> | null;
  /** The original raw instruction bytes, including the discriminator. Always
   *  populated regardless of {@link status}. */
  rawData: Uint8Array;
  /** Bytes that the data serializer did not consume after the discriminator.
   *  An empty array when the serializer fully consumed the buffer or when no
   *  descriptor matched. A non-empty value is typically a sign of a malformed
   *  instruction or a descriptor that disagrees with the on-chain ABI. */
  remainingBytes: Uint8Array;
  /** The accounts used by the instruction, with optional names. */
  accounts: ParsedAccountMeta[];
};

/**
 * A group of CPI inner instructions parsed from a transaction's metadata.
 * @category Transaction Parser
 */
export type ParsedInnerInstructions = {
  /** The index of the outer instruction these inner instructions belong to. */
  index: number;
  /** The parsed inner instructions, in order. */
  instructions: ParsedInstruction[];
};

/**
 * The result of parsing a full transaction: transaction-level metadata
 * alongside the parsed instruction list.
 * @category Transaction Parser
 */
export type ParsedTransaction = {
  /** Legacy or v0. */
  version: TransactionVersion;
  /** The fee-payer account (first account in the message). */
  feePayer: PublicKey;
  /** The recent blockhash committed to by this transaction. */
  blockhash: Blockhash;
  /** The message header (signer counts and readonly counts). */
  header: TransactionMessageHeader;
  /** The static account keys carried directly in the transaction message. */
  staticAccounts: PublicKey[];
  /** Resolved LUT addresses, when available either from `meta.loadedAddresses`
   *  or supplied via `parseTransaction` options. `null` for legacy transactions
   *  or when no LUT data was provided. */
  loadedAddresses: TransactionMetaLoadedAddresses | null;
  /** Signatures in signer order (may contain empty Uint8Arrays for missing sigs). */
  signatures: TransactionSignature[];
  /** Address lookup tables referenced by the transaction, in compiled form. */
  addressLookupTables: CompiledAddressLookupTable[];
  /** Each top-level instruction in the transaction, in order, fully parsed. */
  instructions: ParsedInstruction[];
  /** Parsed inner (CPI) instructions when the transaction has executed
   *  metadata; `null` otherwise. */
  innerInstructions: ParsedInnerInstructions[] | null;
  /** Post-execution metadata when the input was a {@link TransactionWithMeta},
   *  `null` otherwise. */
  meta: TransactionMeta | null;
};

/**
 * Options for {@link parseInstruction}.
 * @category Transaction Parser
 */
export type ParseInstructionOptions = {
  /** Cluster filter used to look up the program in the repository. Defaults
   *  to `'*'` so the parser is decoupled from the umi instance's current
   *  cluster — this lets you parse mainnet transactions against a devnet-
   *  configured umi without having to register the program twice. */
  clusterFilter?: ClusterFilter;
};

/**
 * Options for {@link parseTransaction}.
 * @category Transaction Parser
 */
export type ParseTransactionOptions = {
  /** Resolved addresses from address lookup tables. If omitted and the
   *  transaction is a {@link TransactionWithMeta} carrying
   *  `meta.loadedAddresses`, those are used. Required for v0 transactions
   *  whose instructions reference LUT-loaded accounts. */
  loadedAddresses?: TransactionMetaLoadedAddresses;
  /** Cluster filter used to look up programs. Defaults to `'*'`. */
  clusterFilter?: ClusterFilter;
};

const EMPTY_BYTES = new Uint8Array(0);

function isTransactionWithMeta(
  tx: Transaction | TransactionWithMeta
): tx is TransactionWithMeta {
  return (
    'meta' in tx &&
    (tx as TransactionWithMeta).meta !== null &&
    (tx as TransactionWithMeta).meta !== undefined
  );
}

/**
 * Resolves whether an account at a given flat index is a signer and/or
 * writable, following the Solana account-list layout:
 *
 *   [writable signers] [readonly signers]
 *   [writable static non-signers] [readonly static non-signers]
 *   [writable LUT accounts] [readonly LUT accounts]
 *
 * `message.accounts` always holds *only* the static account keys (matching
 * `staticAccountKeys` from web3.js); LUT-resolved accounts live beyond
 * `message.accounts.length` in the flat index space.
 */
function resolveAccountMeta(
  index: number,
  message: TransactionMessage
): { isSigner: boolean; isWritable: boolean } {
  const {
    numRequiredSignatures,
    numReadonlySignedAccounts,
    numReadonlyUnsignedAccounts,
  } = message.header;
  const numStaticAccounts = message.accounts.length;

  if (index < numRequiredSignatures) {
    return {
      isSigner: true,
      isWritable: index < numRequiredSignatures - numReadonlySignedAccounts,
    };
  }

  if (index < numStaticAccounts) {
    return {
      isSigner: false,
      isWritable: index < numStaticAccounts - numReadonlyUnsignedAccounts,
    };
  }

  // LUT-resolved account: writable LUT entries precede readonly LUT entries.
  const numLutWritable = message.addressLookupTables.reduce(
    (sum, lut) => sum + lut.writableIndexes.length,
    0
  );
  return {
    isSigner: false,
    isWritable: index - numStaticAccounts < numLutWritable,
  };
}

function resolvePubkey(
  index: number,
  message: TransactionMessage,
  loadedAddresses: TransactionMetaLoadedAddresses | null
): PublicKey {
  const numStaticAccounts = message.accounts.length;
  if (index < numStaticAccounts) {
    return message.accounts[index];
  }

  if (!loadedAddresses) {
    throw new Error(
      `Cannot resolve account at flat index ${index}: the transaction uses ` +
        `address lookup tables but no loadedAddresses were supplied. Pass ` +
        `\`options.loadedAddresses\` or call \`parseTransaction\` with a ` +
        `TransactionWithMeta whose meta carries loadedAddresses.`
    );
  }

  const lutIndex = index - numStaticAccounts;
  const numLutWritable = loadedAddresses.writable.length;
  if (lutIndex < numLutWritable) {
    return loadedAddresses.writable[lutIndex];
  }

  const readonlyIndex = lutIndex - numLutWritable;
  if (readonlyIndex >= loadedAddresses.readonly.length) {
    throw new Error(
      `Cannot resolve account at flat index ${index}: out of range for the ` +
        `provided loadedAddresses ` +
        `(writable=${numLutWritable}, readonly=${loadedAddresses.readonly.length}).`
    );
  }
  return loadedAddresses.readonly[readonlyIndex];
}

/**
 * Parses a raw instruction into a {@link ParsedInstruction} by looking up
 * the program and matching the instruction discriminator.
 *
 * Descriptor matching prefers the longest discriminator first so a one-byte
 * discriminator (e.g. SPL Token `[3]`) registered alongside a longer one
 * (e.g. an Anchor 8-byte) cannot shadow it.
 *
 * @param context - A context containing a program repository.
 * @param instruction - The raw instruction to parse.
 * @param index - The zero-based position of this instruction in its transaction.
 * @param options - Optional parser options (e.g. cluster filter).
 * @category Transaction Parser
 */
export function parseInstruction(
  context: Pick<Context, 'programs'>,
  instruction: Instruction,
  index = 0,
  options: ParseInstructionOptions = {}
): ParsedInstruction {
  const { programId, keys, data } = instruction;
  const clusterFilter: ClusterFilter = options.clusterFilter ?? '*';
  const baseAccounts: ParsedAccountMeta[] = keys.map((key) => ({ ...key }));

  if (!context.programs.has(programId, clusterFilter)) {
    return {
      index,
      programName: 'unknown',
      programId,
      instructionName: 'unknown',
      status: 'unknown-program',
      data: null,
      rawData: data,
      remainingBytes: EMPTY_BYTES,
      accounts: baseAccounts,
    };
  }

  const program = context.programs.get(programId, clusterFilter);
  const programName = program.name;
  const descriptors = program.instructions;

  if (!descriptors || descriptors.length === 0) {
    return {
      index,
      programName,
      programId,
      instructionName: 'unknown',
      status: 'no-descriptors',
      data: null,
      rawData: data,
      remainingBytes: EMPTY_BYTES,
      accounts: baseAccounts,
    };
  }

  // Match the longest discriminator first so prefix overlaps don't shadow
  // more specific descriptors.
  const orderedDescriptors = [...descriptors].sort(
    (a, b) => b.discriminator.bytes.length - a.discriminator.bytes.length
  );

  const descriptor = orderedDescriptors.find((desc) => {
    const discSize = desc.discriminator.bytes.length;
    if (data.length < discSize) return false;
    for (let i = 0; i < discSize; i += 1) {
      if (data[i] !== desc.discriminator.bytes[i]) return false;
    }
    return true;
  });

  if (!descriptor) {
    return {
      index,
      programName,
      programId,
      instructionName: 'unknown',
      status: 'no-discriminator-match',
      data: null,
      rawData: data,
      remainingBytes: EMPTY_BYTES,
      accounts: baseAccounts,
    };
  }

  const discSize = descriptor.discriminator.bytes.length;
  const dataAfterDiscriminator = data.subarray(discSize);

  let parsedData: Record<string, unknown>;
  let consumedOffset: number;
  try {
    [parsedData, consumedOffset] = descriptor.dataSerializer.deserialize(
      dataAfterDiscriminator
    );
  } catch {
    return {
      index,
      programName,
      programId,
      instructionName: descriptor.name,
      status: 'deserialize-failed',
      data: null,
      rawData: data,
      remainingBytes: EMPTY_BYTES,
      accounts: baseAccounts,
    };
  }

  const remainingBytes = dataAfterDiscriminator.subarray(consumedOffset);
  const accounts: ParsedAccountMeta[] = keys.map((key, i) => ({
    ...key,
    name: descriptor.accountNames?.[i],
  }));

  return {
    index,
    programName,
    programId,
    instructionName: descriptor.name,
    status: 'parsed',
    data: parsedData,
    rawData: data,
    remainingBytes,
    accounts,
  };
}

/**
 * Parses a full transaction into a {@link ParsedTransaction}, decompiling
 * compiled instructions (resolving index references to public keys and
 * computing signer/writable flags) and running each through
 * {@link parseInstruction}.
 *
 * Accepts either a {@link Transaction} or a {@link TransactionWithMeta}. When
 * given a transaction with meta, post-execution metadata is surfaced on the
 * returned {@link ParsedTransaction.meta}, LUT-resolved pubkeys are taken
 * from `meta.loadedAddresses`, and `meta.innerInstructions` are decompiled
 * into {@link ParsedTransaction.innerInstructions}.
 *
 * For v0 transactions whose instructions reference LUT-resolved accounts
 * without meta, supply `options.loadedAddresses` so the parser can resolve
 * pubkeys; otherwise the parser throws on the first LUT reference.
 *
 * @category Transaction Parser
 */
export function parseTransaction(
  context: Pick<Context, 'programs'>,
  transaction: Transaction | TransactionWithMeta,
  options: ParseTransactionOptions = {}
): ParsedTransaction {
  const { message } = transaction;
  const meta = isTransactionWithMeta(transaction) ? transaction.meta : null;
  const loadedAddresses =
    options.loadedAddresses ?? meta?.loadedAddresses ?? null;
  const clusterFilter: ClusterFilter = options.clusterFilter ?? '*';

  const decompileInstruction = (
    compiledIx: CompiledInstruction,
    ixIndex: number
  ): ParsedInstruction => {
    const programId = resolvePubkey(
      compiledIx.programIndex,
      message,
      loadedAddresses
    );
    const keys: AccountMeta[] = compiledIx.accountIndexes.map((accIndex) => ({
      pubkey: resolvePubkey(accIndex, message, loadedAddresses),
      ...resolveAccountMeta(accIndex, message),
    }));
    return parseInstruction(
      context,
      { programId, keys, data: compiledIx.data },
      ixIndex,
      { clusterFilter }
    );
  };

  const instructions = message.instructions.map(decompileInstruction);

  const innerInstructions: ParsedInnerInstructions[] | null =
    meta?.innerInstructions != null
      ? meta.innerInstructions.map((inner) => ({
          index: inner.index,
          instructions: inner.instructions.map(decompileInstruction),
        }))
      : null;

  return {
    version: message.version,
    feePayer: message.accounts[0],
    blockhash: message.blockhash,
    header: message.header,
    staticAccounts: [...message.accounts],
    loadedAddresses,
    signatures: [...transaction.signatures],
    addressLookupTables: [...message.addressLookupTables],
    instructions,
    innerInstructions,
    meta,
  };
}

import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { Serializer } from '@metaplex-foundation/umi-serializers';
import type { Context } from './Context';
import type { AccountMeta, Instruction } from './Instruction';
import type {
  Blockhash,
  CompiledAddressLookupTable,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  TransactionVersion,
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
  /** The deserialized instruction data, or the raw Uint8Array if unknown. */
  data: Record<string, unknown> | Uint8Array;
  /** The accounts used by the instruction, with optional names. */
  accounts: ParsedAccountMeta[];
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
  /** Signatures in signer order (may contain empty Uint8Arrays for missing sigs). */
  signatures: TransactionSignature[];
  /** Address lookup tables referenced by the transaction. */
  addressLookupTables: CompiledAddressLookupTable[];
  /** Each instruction in the transaction, in order, fully parsed. */
  instructions: ParsedInstruction[];
};

/**
 * Resolves whether an account at a given flat index is a signer and/or
 * writable, following the Solana account-list layout:
 *
 *   [writable signers] [readonly signers]
 *   [writable static non-signers] [readonly static non-signers]
 *   [writable LUT accounts] [readonly LUT accounts]
 *
 * The header's `numReadonlyUnsignedAccounts` counts only *static* readonly
 * non-signers, so for v0 transactions the total account count cannot be used
 * naively — we must derive the static account count from the lookup tables.
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

  // Signer accounts occupy the first numRequiredSignatures slots.
  if (index < numRequiredSignatures) {
    return {
      isSigner: true,
      isWritable: index < numRequiredSignatures - numReadonlySignedAccounts,
    };
  }

  // Compute how many accounts come from lookup tables so we can separate them
  // from the static non-signer accounts.
  const numLutAccounts = message.addressLookupTables.reduce(
    (sum, lut) => sum + lut.writableIndexes.length + lut.readonlyIndexes.length,
    0
  );
  const numStaticAccounts = message.accounts.length - numLutAccounts;

  if (index < numStaticAccounts) {
    // Static non-signer: writable unless in the trailing readonly region.
    return {
      isSigner: false,
      isWritable: index < numStaticAccounts - numReadonlyUnsignedAccounts,
    };
  }

  // LUT-resolved account: writable LUT accounts precede readonly LUT accounts.
  const numLutWritable = message.addressLookupTables.reduce(
    (sum, lut) => sum + lut.writableIndexes.length,
    0
  );
  return {
    isSigner: false,
    isWritable: index - numStaticAccounts < numLutWritable,
  };
}

/**
 * Parses a raw instruction into a {@link ParsedInstruction} by looking up
 * the program and matching the instruction discriminator.
 *
 * @param context - A context containing a program repository.
 * @param instruction - The raw instruction to parse.
 * @param index - The zero-based position of this instruction in its transaction.
 * @returns A fully parsed instruction with program name, instruction name,
 *          deserialized data, and named accounts when available.
 * @category Transaction Parser
 */
export function parseInstruction(
  context: Pick<Context, 'programs'>,
  instruction: Instruction,
  index = 0
): ParsedInstruction {
  const { programId, keys, data } = instruction;

  if (!context.programs.has(programId)) {
    return {
      index,
      programName: 'unknown',
      programId,
      instructionName: 'unknown',
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  const program = context.programs.get(programId);
  const programName = program.name;
  const instructionDescriptors = program.instructions;

  if (!instructionDescriptors || instructionDescriptors.length === 0) {
    return {
      index,
      programName,
      programId,
      instructionName: 'unknown',
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  const descriptor = instructionDescriptors.find((desc) => {
    const discSize = desc.discriminator.bytes.length;
    if (data.length < discSize) return false;
    return data
      .subarray(0, discSize)
      .every((byte, i) => byte === desc.discriminator.bytes[i]);
  });

  if (!descriptor) {
    return {
      index,
      programName,
      programId,
      instructionName: 'unknown',
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  const discSize = descriptor.discriminator.bytes.length;
  const dataAfterDiscriminator = data.subarray(discSize);
  let parsedData: Record<string, unknown>;
  try {
    [parsedData] = descriptor.dataSerializer.deserialize(dataAfterDiscriminator);
  } catch {
    return {
      index,
      programName,
      programId,
      instructionName: descriptor.name,
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  const accounts: ParsedAccountMeta[] = keys.map((key, i) => ({
    ...key,
    name: descriptor.accountNames?.[i],
  }));

  return {
    index,
    programName,
    programId,
    instructionName: descriptor.name,
    data: parsedData,
    accounts,
  };
}

/**
 * Parses a full transaction into a {@link ParsedTransaction}, decompiling
 * compiled instructions (resolving index references to public keys and
 * computing signer/writable flags) and running each through
 * {@link parseInstruction}.
 *
 * The returned object includes transaction-level metadata — version, fee
 * payer, blockhash, signatures, and address lookup tables — in addition to
 * the parsed instruction list.
 *
 * @category Transaction Parser
 */
export function parseTransaction(
  context: Pick<Context, 'programs'>,
  transaction: Transaction
): ParsedTransaction {
  const { message } = transaction;

  const instructions = message.instructions.map((compiledIx, ixIndex) => {
    const programId = message.accounts[compiledIx.programIndex];
    const keys = compiledIx.accountIndexes.map((accountIndex) => {
      const pubkey = message.accounts[accountIndex];
      const { isSigner, isWritable } = resolveAccountMeta(accountIndex, message);
      return { pubkey, isSigner, isWritable };
    });
    return parseInstruction(context, { programId, keys, data: compiledIx.data }, ixIndex);
  });

  return {
    version: message.version,
    feePayer: message.accounts[0],
    blockhash: message.blockhash,
    signatures: [...transaction.signatures],
    addressLookupTables: [...message.addressLookupTables],
    instructions,
  };
}

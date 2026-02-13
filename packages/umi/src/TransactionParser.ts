import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { Serializer } from '@metaplex-foundation/umi-serializers';
import type { Context } from './Context';
import type { AccountMeta, Instruction } from './Instruction';
import type { Transaction } from './Transaction';

/**
 * Defines the discriminator bytes used to identify an instruction.
 * @category Transaction Parser
 */
export type InstructionDiscriminator = {
  /** The raw discriminator bytes to match against. */
  bytes: Uint8Array;
  /** The number of bytes the discriminator occupies at the start of instruction data. */
  size: number;
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
  /** The registered name of the program, or 'unknown'. */
  programName: string;
  /** The public key of the program. */
  programId: PublicKey;
  /** The name of the instruction, or 'unknown'. */
  instructionName: string;
  /** The deserialized instruction data, or the raw Uint8Array if unknown. */
  data: object | Uint8Array;
  /** The accounts used by the instruction, with optional names. */
  accounts: ParsedAccountMeta[];
};

/**
 * Parses a raw instruction into a {@link ParsedInstruction} by looking up
 * the program and matching the instruction discriminator.
 *
 * @param context - A context containing a program repository.
 * @param instruction - The raw instruction to parse.
 * @returns A fully parsed instruction with program name, instruction name,
 *          deserialized data, and named accounts when available.
 * @category Transaction Parser
 */
export function parseInstruction(
  context: Pick<Context, 'programs'>,
  instruction: Instruction
): ParsedInstruction {
  const { programId, keys, data } = instruction;

  // Check if the program is registered in the repository.
  if (!context.programs.has(programId)) {
    return {
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

  // If no instruction descriptors are registered, return with known program but unknown instruction.
  if (!instructionDescriptors || instructionDescriptors.length === 0) {
    return {
      programName,
      programId,
      instructionName: 'unknown',
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  // Find matching descriptor by comparing discriminator bytes.
  const descriptor = instructionDescriptors.find((desc) => {
    if (data.length < desc.discriminator.size) return false;
    const dataSlice = data.slice(0, desc.discriminator.size);
    return dataSlice.every((byte, i) => byte === desc.discriminator.bytes[i]);
  });

  // No matching discriminator found.
  if (!descriptor) {
    return {
      programName,
      programId,
      instructionName: 'unknown',
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  // Deserialize instruction data after the discriminator.
  const dataAfterDiscriminator = data.slice(descriptor.discriminator.size);
  let parsedData: object;
  try {
    [parsedData] = descriptor.dataSerializer.deserialize(dataAfterDiscriminator);
  } catch {
    // If deserialization fails, return raw data.
    return {
      programName,
      programId,
      instructionName: descriptor.name,
      data,
      accounts: keys.map((key) => ({ ...key })),
    };
  }

  // Map account names positionally.
  const accounts: ParsedAccountMeta[] = keys.map((key, index) => ({
    ...key,
    name: descriptor.accountNames?.[index],
  }));

  return {
    programName,
    programId,
    instructionName: descriptor.name,
    data: parsedData,
    accounts,
  };
}

/**
 * Parses all instructions in a transaction by decompiling compiled instructions
 * and running each through {@link parseInstruction}.
 *
 * @category Transaction Parser
 */
export function parseTransaction(
  context: Pick<Context, 'programs'>,
  transaction: Transaction
): ParsedInstruction[] {
  const { message } = transaction;
  return message.instructions.map((compiledIx) => {
    // Decompile: resolve program ID and account keys from indexes.
    const programId = message.accounts[compiledIx.programIndex];
    const keys = compiledIx.accountIndexes.map((index) => {
      const pubkey = message.accounts[index];
      const numSigners = message.header.numRequiredSignatures;
      const numReadonlySigned = message.header.numReadonlySignedAccounts;
      const numReadonlyUnsigned = message.header.numReadonlyUnsignedAccounts;
      const isSigner = index < numSigners;
      const isWritable = isSigner
        ? index < numSigners - numReadonlySigned
        : index < message.accounts.length - numReadonlyUnsigned;
      return { pubkey, isSigner, isWritable };
    });

    return parseInstruction(context, {
      programId,
      keys,
      data: compiledIx.data,
    });
  });
}

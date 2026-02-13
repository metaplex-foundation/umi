import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { Serializer } from '@metaplex-foundation/umi-serializers';
import type { AccountMeta } from './Instruction';

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

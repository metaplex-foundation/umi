import { AccountMeta, Instruction } from '@metaplex-foundation/umi';
import {
  AccountRole,
  IInstruction as KitInstruction,
} from '@solana/instructions';
import { toKitAddress, fromKitAddress } from './PublicKey';

// Conversion utilities for Instruction between @solana/kit and umi
// Both Kit and umi instructions are similar in structure (object with keys, programId, data).
// These are identity functions for now, but provided for clarity and future-proofing.

/**
 * Converts a Kit instruction to an umi Instruction.
 */
export function fromKitInstruction(
  kitInstruction: KitInstruction
): Instruction {
  return {
    programId: fromKitAddress(kitInstruction.programAddress),
    keys: (kitInstruction.accounts ?? []).map((account) => {
      let isSigner = false;
      let isWritable = false;
      switch (account.role) {
        case AccountRole.WRITABLE_SIGNER:
          isSigner = true;
          isWritable = true;
          break;
        case AccountRole.READONLY_SIGNER:
          isSigner = true;
          isWritable = false;
          break;
        case AccountRole.WRITABLE:
          isSigner = false;
          isWritable = true;
          break;
        case AccountRole.READONLY:
        default:
          isSigner = false;
          isWritable = false;
          break;
      }
      return {
        pubkey: fromKitAddress(account.address),
        isSigner,
        isWritable,
      } as AccountMeta;
    }),
    data:
      kitInstruction.data instanceof Uint8Array
        ? kitInstruction.data
        : new Uint8Array(),
  };
}

/**
 * Converts a umi Instruction to a Kit instruction.
 * In practice, this is just an identity function.
 * TODO: Add stricter type checks or conversions if Kit/umi diverge.
 */
export function toKitInstruction(umiInstruction: Instruction): KitInstruction {
  // Convert a umi Instruction to a Kit instruction
  const accounts = umiInstruction.keys.map((key: AccountMeta) => {
    let role: AccountRole;
    if (key.isSigner && key.isWritable) {
      role = AccountRole.WRITABLE_SIGNER;
    } else if (key.isSigner) {
      role = AccountRole.READONLY_SIGNER;
    } else if (key.isWritable) {
      role = AccountRole.WRITABLE;
    } else {
      role = AccountRole.READONLY;
    }
    return {
      address: toKitAddress(key.pubkey),
      role,
    };
  });
  const kitInstruction: any = {
    programAddress: toKitAddress(umiInstruction.programId),
    data: umiInstruction.data,
  };
  if (accounts.length > 0) {
    kitInstruction.accounts = accounts;
  }
  return kitInstruction;
}

import { InterfaceImplementationMissingError } from './errors';
import type { Keypair } from './Keypair';
import type { Pda, PublicKey } from './PublicKey';

/**
 * Defines the interface for the EdDSA cryptography algorithm.
 * It allows us to create, find and use public keys and keypairs.
 *
 * @category Interfaces
 */
export interface EddsaInterface {
  /** Generates a new keypair. */
  generateKeypair: () => Keypair;
  /** Restores a keypair from a secret key. */
  createKeypairFromSecretKey: (secretKey: Uint8Array) => Keypair;
  /** Restores a keypair from a seed. */
  createKeypairFromSeed: (seed: Uint8Array) => Keypair;
  /** Whether the given public key is on the EdDSA elliptic curve. */
  isOnCurve: (publicKey: PublicKey) => boolean;
  /** Finds a Program-Derived Address from the given programId and seeds. */
  findPda: (programId: PublicKey, seeds: Uint8Array[]) => Pda;
  /** Signs a message with the given keypair. */
  sign: (message: Uint8Array, keypair: Keypair) => Uint8Array;
  /** Verifies a signature for a message with the given public key. */
  verify: (
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey
  ) => boolean;
}

/**
 * An implementation of the {@link EddsaInterface} that throws an error when called.
 * @category Interfaces — Eddsa
 */
export class NullEddsa implements EddsaInterface {
  generateKeypair(): Keypair {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }

  createKeypairFromSecretKey(): Keypair {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }

  createKeypairFromSeed(): Keypair {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }

  isOnCurve(): boolean {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }

  findPda(): Pda {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }

  sign(): Uint8Array {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }

  verify(): boolean {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  }
}

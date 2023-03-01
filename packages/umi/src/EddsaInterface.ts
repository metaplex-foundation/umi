import { InterfaceImplementationMissingError } from './errors';
import type { Keypair } from './Keypair';
import type { Pda, PublicKey } from './PublicKey';

export interface EddsaInterface {
  generateKeypair: () => Keypair;
  createKeypairFromSecretKey: (secretKey: Uint8Array) => Keypair;
  createKeypairFromSeed: (seed: Uint8Array) => Keypair;
  isOnCurve: (publicKey: PublicKey) => boolean;
  findPda: (programId: PublicKey, seeds: Uint8Array[]) => Pda;
  sign: (message: Uint8Array, keypair: Keypair) => Uint8Array;
  verify: (
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey
  ) => boolean;
}

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

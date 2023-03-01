import {
  EddsaInterface,
  Keypair,
  Pda,
  publicKey,
  PublicKey,
  PublicKeyInput,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsKeypair,
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import * as ed25519 from '@noble/ed25519';
import {
  Keypair as Web3JsKeypair,
  PublicKey as Web3JsPublicKey,
} from '@solana/web3.js';

export class Web3JsEddsa implements EddsaInterface {
  generateKeypair(): Keypair {
    return fromWeb3JsKeypair(Web3JsKeypair.generate());
  }

  createKeypairFromSecretKey(secretKey: Uint8Array): Keypair {
    return fromWeb3JsKeypair(Web3JsKeypair.fromSecretKey(secretKey));
  }

  createKeypairFromSeed(seed: Uint8Array): Keypair {
    return fromWeb3JsKeypair(Web3JsKeypair.fromSeed(seed));
  }

  isOnCurve(input: PublicKeyInput): boolean {
    return Web3JsPublicKey.isOnCurve(toWeb3JsPublicKey(publicKey(input)));
  }

  findPda(programId: PublicKeyInput, seeds: Uint8Array[]): Pda {
    const [key, bump] = Web3JsPublicKey.findProgramAddressSync(
      seeds,
      toWeb3JsPublicKey(publicKey(programId))
    );
    return { ...fromWeb3JsPublicKey(key), bump };
  }

  sign(message: Uint8Array, keypair: Keypair): Uint8Array {
    return ed25519.sync.sign(message, keypair.secretKey.slice(0, 32));
  }

  verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey
  ): boolean {
    return ed25519.sync.verify(signature, message, publicKey.bytes);
  }
}

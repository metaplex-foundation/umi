import { publicKey, PublicKey } from '@metaplex-foundation/umi';
import { address, Address } from '@solana/kit';

// Conversion utilities for Address between @solana/kit and umi
// Kit and umi both use base58 strings for addresses/public keys.
// These are identity functions, but provided for clarity and future-proofing.

/**
 * Converts a Kit address (string) to a umi PublicKey (string).
 * In practice, this is just an identity function.
 */
export function fromKitAddress(kitAddress: Address): PublicKey {
  return publicKey(kitAddress.toString());
}

/**
 * Converts a umi PublicKey (string) to a Kit address (string).
 * In practice, this is just an identity function.
 */
export function toKitAddress(umiPublicKey: PublicKey): Address {
  return address(umiPublicKey.toString());
}

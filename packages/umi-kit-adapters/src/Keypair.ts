import { Keypair, publicKey } from '@metaplex-foundation/umi';
import { createKeyPairFromBytes } from '@solana/keys';
import { getAddressDecoder } from '@solana/kit';

export function extractEd25519SecretKeyFromPkcs8(
  pkcs8: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  // PKCS8 Ed25519 private key ends with: 0x04 0x20 <32-byte-secret-key>
  if (
    pkcs8.length >= 34 &&
    pkcs8[pkcs8.length - 34] === 0x04 &&
    pkcs8[pkcs8.length - 33] === 0x20
  ) {
    const secret = pkcs8.slice(pkcs8.length - 32);
    // Ed25519 secretKey is 64 bytes: 32-byte secret + 32-byte public
    const secretKey = new Uint8Array(64);
    secretKey.set(secret);
    secretKey.set(publicKey, 32);
    return secretKey;
  }
  throw new Error('Invalid PKCS8 Ed25519 private key format');
}

/**
 * Converts a Kit CryptoKeyPair to a umi Keypair ({ publicKey, secretKey }).
 * Uses WebCrypto API to export the keys as Uint8Array.
 */
export async function fromKitKeypair(
  kitKeypair: CryptoKeyPair
): Promise<Keypair> {
  // Export the public key as raw bytes
  const publicKeyBuffer = await crypto.subtle.exportKey(
    'raw',
    kitKeypair.publicKey
  );
  // Export the private key as pkcs8
  const secretKeyPkcs8Buffer = await crypto.subtle.exportKey(
    'pkcs8',
    kitKeypair.privateKey
  );
  // Convert ArrayBuffers to Uint8Array
  const publicKeyByteArray = new Uint8Array(publicKeyBuffer);
  const secretKeyPkcs8ByteArray = new Uint8Array(secretKeyPkcs8Buffer);
  // Extract 32-byte secret and concatenate with public key to form 64-byte secretKey
  const secretKeyByteArray = extractEd25519SecretKeyFromPkcs8(
    secretKeyPkcs8ByteArray,
    publicKeyByteArray
  );
  return {
    publicKey: publicKey(getAddressDecoder().decode(publicKeyByteArray)),
    secretKey: secretKeyByteArray,
  };
}

/**
 * Converts a umi Keypair ({ publicKey, secretKey }) to a Kit CryptoKeyPair.
 * Uses Kit's createKeyPairFromBytes utility.
 */
export function toKitKeypair(umiKeypair: Keypair): Promise<CryptoKeyPair> {
    // The secretKey already contains both secret (32 bytes) and public (32 bytes)  
    return createKeyPairFromBytes(umiKeypair.secretKey, true);
} 

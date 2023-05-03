import { base58, uniqueBy } from './utils';

/**
 * The amount of bytes in a public key.
 * @category Signers and PublicKeys
 */
export const PUBLIC_KEY_LENGTH = 32;

/**
 * Defines an object that has a public key.
 * @category Signers and PublicKeys
 */
export type HasPublicKey = { publicKey: PublicKey };

/**
 * A base58 string that represents a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyBase58 = string;

/**
 * A Uint8Array that represents a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyBytes = Uint8Array;

/**
 * Defines all the possible inputs for creating a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyInput =
  | HasPublicKey
  | PublicKey
  | PublicKeyBase58
  | PublicKeyBytes
  | { toBytes: () => PublicKeyBytes };

/**
 * Defines a public key.
 * @category Signers and PublicKeys
 */
export type PublicKey = {
  readonly bytes: PublicKeyBytes;
};

/**
 * Defines a Program-Derived Address.
 *
 * It is a public key with the bump number that was used
 * to ensure the address is not on the ed25519 curve.
 *
 * @category Signers and PublicKeys
 */
export type Pda = PublicKey & {
  readonly bump: number;
};

/**
 * Creates a new public key from the given input.
 * @category Signers and PublicKeys
 */
export const publicKey = (input: PublicKeyInput): PublicKey => {
  let key: PublicKey;
  // PublicKeyBase58.
  if (typeof input === 'string') {
    key = { bytes: base58.serialize(input) };
  }
  // HasPublicKey.
  else if (typeof input === 'object' && 'publicKey' in input) {
    key = { bytes: new Uint8Array(input.publicKey.bytes) };
  }
  // Web3JS-compatible PublicKey.
  else if (typeof input === 'object' && 'toBytes' in input) {
    key = { bytes: new Uint8Array(input.toBytes()) };
  }
  // PublicKey.
  else if (isPublicKey(input)) {
    key = { bytes: new Uint8Array(input.bytes) };
  }
  // PublicKeyBytes.
  else {
    key = { bytes: new Uint8Array(input) };
  }

  assertPublicKey(key);
  return key;
};

/**
 * Creates the default public key which is composed of all zero bytes.
 * @category Signers and PublicKeys
 */
export const defaultPublicKey = (): PublicKey =>
  publicKey('11111111111111111111111111111111');

/**
 * Whether the given value is a valid public key.
 * @category Signers and PublicKeys
 */
export const isPublicKey = (value: any): value is PublicKey =>
  typeof value === 'object' &&
  typeof value.bytes === 'object' &&
  typeof value.bytes.BYTES_PER_ELEMENT === 'number' &&
  typeof value.bytes.length === 'number' &&
  value.bytes.BYTES_PER_ELEMENT === 1 &&
  value.bytes.length === PUBLIC_KEY_LENGTH;

/**
 * Whether the given value is a valid program-derived address.
 * @category Signers and PublicKeys
 */
export const isPda = (value: any): value is Pda =>
  typeof value === 'object' &&
  typeof value.bump === 'number' &&
  isPublicKey(value);

/**
 * Ensures the given value is a valid public key.
 * @category Signers and PublicKeys
 */
export function assertPublicKey(value: any): asserts value is PublicKey {
  if (!isPublicKey(value)) {
    throw new Error('Invalid public key');
  }
}

/**
 * Whether the given public keys are the same.
 * @category Signers and PublicKeys
 */
export const samePublicKey = (
  left: PublicKeyInput,
  right: PublicKeyInput
): boolean =>
  publicKey(left).bytes.toString() === publicKey(right).bytes.toString();

/**
 * Deduplicates the given array of public keys.
 * @category Signers and PublicKeys
 */
export const uniquePublicKeys = (publicKeys: PublicKey[]): PublicKey[] =>
  uniqueBy(publicKeys, samePublicKey);

/**
 * Converts the given public key to a base58 string.
 * @category Signers and PublicKeys
 */
export const base58PublicKey = (key: PublicKeyInput): string =>
  base58.deserialize(publicKey(key).bytes)[0];

/**
 * Helper function that enables public keys and signers
 * to override the `isWritable` property of an account meta.
 * @category Signers and PublicKeys
 * @deprecated This function was used by Kinobi-generated libraries but
 * is no longer needed as they now export their helpers.
 */
export const checkForIsWritableOverride = (
  account: (PublicKey | HasPublicKey) & { isWritable?: boolean },
  value: boolean
): boolean =>
  'isWritable' in account && typeof account.isWritable === 'boolean'
    ? account.isWritable
    : value;

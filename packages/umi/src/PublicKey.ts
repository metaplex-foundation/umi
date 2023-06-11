import { InvalidPublicKeyError } from './errors';
import { base58 } from './utils';

/**
 * The amount of bytes in a public key.
 * @category Signers and PublicKeys
 */
export const PUBLIC_KEY_LENGTH = 32;

/**
 * Defines a public key as a base58 string.
 * @category Signers and PublicKeys
 */
export type PublicKey = string;

/**
 * Defines a Program-Derived Address.
 *
 * It is a public key with the bump number that was used
 * to ensure the address is not on the ed25519 curve.
 *
 * @category Signers and PublicKeys
 */
export type Pda = [PublicKey, number];

/**
 * Defines all the possible inputs for creating a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyInput =
  | string
  | Uint8Array
  | Pda
  | { publicKey: string }
  | { toBase58: () => string };

/**
 * A Uint8Array that represents a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyBytes = Uint8Array;

/**
 * Defines an object that has a public key.
 * @category Signers and PublicKeys
 */
export type HasPublicKey = {
  readonly publicKey: PublicKey;
};

/**
 * Creates a new public key from the given input.
 * @category Signers and PublicKeys
 */
export const publicKey = (input: PublicKeyInput): PublicKey => {
  let key: string;
  // PublicKey.
  if (typeof input === 'string') {
    key = input;
  }
  // HasPublicKey.
  else if (typeof input === 'object' && 'publicKey' in input) {
    key = input.publicKey;
  }
  // Legacy Web3JS-compatible PublicKey.
  else if (typeof input === 'object' && 'toBase58' in input) {
    key = input.toBase58();
  }
  // Pda.
  else if (Array.isArray(input)) {
    [key] = input;
  }
  // PublicKeyBytes.
  else {
    [key] = base58.deserialize(input);
  }

  assertPublicKey(key);
  return key;
};

/**
 * Creates the default public key which is composed of all zero bytes.
 * @category Signers and PublicKeys
 */
export const defaultPublicKey = (): PublicKey =>
  '11111111111111111111111111111111' as PublicKey;

/**
 * Whether the given value is a valid public key.
 * @category Signers and PublicKeys
 */
export const isPublicKey = (value: any): value is PublicKey => {
  try {
    assertPublicKey(value);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Whether the given value is a valid program-derived address.
 * @category Signers and PublicKeys
 */
export const isPda = (value: any): value is Pda =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[1] === 'number' &&
  isPublicKey(value[0]);

/**
 * Ensures the given value is a valid public key.
 * @category Signers and PublicKeys
 */
export function assertPublicKey(value: any): asserts value is PublicKey {
  // Check value type.
  if (typeof value !== 'string') {
    throw new InvalidPublicKeyError(value, 'Public keys must be strings.');
  }

  // Check base58 encoding and byte length.
  publicKeyBytes(value as PublicKey);
}

/**
 * Whether the given public keys are the same.
 * @category Signers and PublicKeys
 * @deprecated Use `left === right` instead now that public keys are base58 strings.
 */
export const samePublicKey = (
  left: PublicKeyInput,
  right: PublicKeyInput
): boolean => publicKey(left) === publicKey(right);

/**
 * Deduplicates the given array of public keys.
 * @category Signers and PublicKeys
 */
export const uniquePublicKeys = (publicKeys: PublicKey[]): PublicKey[] => [
  ...new Set(publicKeys),
];

/**
 * Converts the given public key to a Uint8Array.
 * @category Signers and PublicKeys
 */
export const publicKeyBytes = (value: PublicKey): PublicKeyBytes => {
  // Check string length to avoid unnecessary base58 encoding.
  if (value.length < 32 || value.length > 44) {
    throw new InvalidPublicKeyError(
      value,
      'Public keys must be between 32 and 44 characters.'
    );
  }

  // Check base58 encoding.
  let bytes: Uint8Array;
  try {
    bytes = base58.serialize(value);
  } catch (error) {
    throw new InvalidPublicKeyError(
      value,
      'Public keys must be base58 encoded.'
    );
  }

  // Check byte length.
  if (bytes.length !== PUBLIC_KEY_LENGTH) {
    throw new InvalidPublicKeyError(
      value,
      `Public keys must be ${PUBLIC_KEY_LENGTH} bytes.`
    );
  }

  return bytes;
};

/**
 * Converts the given public key to a base58 string.
 * @category Signers and PublicKeys
 * @deprecated Public keys are now represented directly as base58 strings.
 */
export const base58PublicKey = (key: PublicKeyInput): string => publicKey(key);

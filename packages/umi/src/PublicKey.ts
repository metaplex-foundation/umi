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
export type PublicKey = string & { readonly __publicKey: unique symbol };

/**
 * Defines a Program-Derived Address.
 *
 * It is a public key with the bump number that was used
 * to ensure the address is not on the ed25519 curve.
 *
 * @category Signers and PublicKeys
 */
export type Pda = [PublicKey, number] & { readonly __pda: unique symbol };

/**
 * A Uint8Array that represents a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyBytes = Uint8Array & {
  readonly __publicKeyBytes: unique symbol;
};

/**
 * Defines an object that has a public key.
 * @category Signers and PublicKeys
 */
export type HasPublicKey = {
  readonly publicKey: PublicKey;
};

/**
 * Defines an object that can be converted to a base58 public key.
 * @category Signers and PublicKeys
 */
export type LegacyWeb3JsPublicKey = {
  toBase58: () => string;
};

/**
 * Defines all the possible inputs for creating a public key.
 * @category Signers and PublicKeys
 */
export type PublicKeyInput =
  | string
  | Uint8Array
  | [string, number]
  | { publicKey: string }
  | LegacyWeb3JsPublicKey;

/**
 * Defines all the possible safe inputs for creating a public key.
 * That is, they have already been validated to be or
 * to contain a valid public key.
 * @category Signers and PublicKeys
 */
export type SafePublicKeyInput =
  | PublicKey
  | PublicKeyBytes
  | Pda
  | HasPublicKey
  | LegacyWeb3JsPublicKey;

/**
 * Creates a new public key from the given input.
 * @category Signers and PublicKeys
 */
export function publicKey(
  input: PublicKeyInput,
  assertValidPublicKey?: true
): PublicKey;
export function publicKey(
  input: SafePublicKeyInput,
  assertValidPublicKey: false
): PublicKey;
export function publicKey(
  input: PublicKeyInput | SafePublicKeyInput,
  assertValidPublicKey: boolean = true
): PublicKey {
  const key = ((): string => {
    if (typeof input === 'string') {
      return input;
    }
    // HasPublicKey.
    if (typeof input === 'object' && 'publicKey' in input) {
      return input.publicKey;
    }
    // LegacyWeb3JsPublicKey.
    if (typeof input === 'object' && 'toBase58' in input) {
      return input.toBase58();
    }
    // Pda.
    if (Array.isArray(input)) {
      return input[0];
    }
    // PublicKeyBytes.
    return base58.deserialize(input)[0];
  })();

  if (assertValidPublicKey) {
    assertPublicKey(key);
  }

  return key as PublicKey;
}

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

  return bytes as PublicKeyBytes;
};

/**
 * Converts the given public key to a base58 string.
 * @category Signers and PublicKeys
 * @deprecated Public keys are now represented directly as base58 strings.
 */
export const base58PublicKey = (key: PublicKeyInput): string => publicKey(key);

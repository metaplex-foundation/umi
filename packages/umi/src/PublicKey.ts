import { base58, uniqueBy } from './utils';

export const PUBLIC_KEY_LENGTH = 32;

export type HasPublicKey = { publicKey: PublicKey };
export type PublicKeyBase58 = string;
export type PublicKeyBytes = Uint8Array;
export type PublicKeyInput =
  | HasPublicKey
  | PublicKey
  | PublicKeyBase58
  | PublicKeyBytes;

export type PublicKey = {
  readonly bytes: PublicKeyBytes;
};

export type Pda = PublicKey & {
  readonly bump: number;
};

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

export const defaultPublicKey = (): PublicKey =>
  publicKey('11111111111111111111111111111111');

export const isPublicKey = (value: any): value is PublicKey =>
  typeof value === 'object' &&
  typeof value.bytes === 'object' &&
  typeof value.bytes.BYTES_PER_ELEMENT === 'number' &&
  typeof value.bytes.length === 'number' &&
  value.bytes.BYTES_PER_ELEMENT === 1 &&
  value.bytes.length === PUBLIC_KEY_LENGTH;

export const isPda = (value: any): value is Pda =>
  typeof value === 'object' &&
  typeof value.bump === 'number' &&
  isPublicKey(value);

export function assertPublicKey(value: any): asserts value is PublicKey {
  if (!isPublicKey(value)) {
    throw new Error('Invalid public key');
  }
}

export const samePublicKey = (
  left: PublicKeyInput,
  right: PublicKeyInput
): boolean =>
  publicKey(left).bytes.toString() === publicKey(right).bytes.toString();

export const uniquePublicKeys = (publicKeys: PublicKey[]): PublicKey[] =>
  uniqueBy(publicKeys, samePublicKey);

export const base58PublicKey = (key: PublicKeyInput): string =>
  base58.deserialize(publicKey(key).bytes)[0];

export const checkForIsWritableOverride = (
  account: (PublicKey | HasPublicKey) & { isWritable?: boolean },
  value: boolean
): boolean =>
  'isWritable' in account && typeof account.isWritable === 'boolean'
    ? account.isWritable
    : value;

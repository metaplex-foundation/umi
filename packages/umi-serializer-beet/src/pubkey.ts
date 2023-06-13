import {
  PUBLIC_KEY_LENGTH,
  PublicKey,
  PublicKeyInput,
  PublicKeySerializerOptions,
  Serializer,
  publicKeyBytes,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import { DeserializingEmptyBufferError, NotEnoughBytesError } from './errors';

export function publicKey(
  options: PublicKeySerializerOptions = {}
): Serializer<PublicKeyInput, PublicKey> {
  return {
    description: options.description ?? 'publicKey',
    fixedSize: 32,
    maxSize: 32,
    serialize: (value: PublicKeyInput) => publicKeyBytes(toPublicKey(value)),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const pubkeyBytes = bytes.slice(offset, offset + 32);
      if (pubkeyBytes.length === 0) {
        throw new DeserializingEmptyBufferError('publicKey');
      }
      if (pubkeyBytes.length < PUBLIC_KEY_LENGTH) {
        throw new NotEnoughBytesError(
          'publicKey',
          PUBLIC_KEY_LENGTH,
          pubkeyBytes.length
        );
      }
      return [toPublicKey(pubkeyBytes), offset + 32];
    },
  };
}

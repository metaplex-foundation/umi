import {
  publicKey as toPublicKey,
  PublicKey,
  PublicKeyInput,
  PublicKeySerializerOptions,
  Serializer,
} from '@metaplex-foundation/umi';
import { DeserializingEmptyBufferError, BeetSerializerError } from './errors';

export function publicKey(
  options: PublicKeySerializerOptions = {}
): Serializer<PublicKeyInput, PublicKey> {
  return {
    description: options.description ?? 'publicKey',
    fixedSize: 32,
    maxSize: 32,
    serialize: (value: PublicKeyInput) => toPublicKey(value).bytes,
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('publicKey');
      }
      const pubkeyBytes = bytes.slice(offset, offset + 32);
      if (pubkeyBytes.length < 32) {
        throw new BeetSerializerError(
          `Serializer [publicKey] expected 32 bytes, got ${pubkeyBytes.length}.`
        );
      }
      return [toPublicKey(pubkeyBytes), offset + 32];
    },
  };
}

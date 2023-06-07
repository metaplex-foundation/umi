import {
  BytesSerializerOptions,
  Serializer,
  fixSerializer,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { DeserializingEmptyBufferError, NotEnoughBytesError } from './errors';
import { getSizeDescription } from './getSizeDescription';

export function bytes(
  options: BytesSerializerOptions = {}
): Serializer<Uint8Array> {
  const size = options.size ?? 'variable';
  const description =
    options.description ?? `bytes(${getSizeDescription(size)})`;

  const byteSerializer: Serializer<Uint8Array> = {
    description,
    fixedSize: null,
    maxSize: null,
    serialize: (value: Uint8Array) => new Uint8Array(value),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const slice = new Uint8Array(bytes.slice(offset));
      return [slice, offset + slice.length];
    },
  };

  if (size === 'variable') {
    return byteSerializer;
  }

  if (typeof size === 'number') {
    return fixSerializer(byteSerializer, size, description);
  }

  return {
    description,
    fixedSize: null,
    maxSize: null,
    serialize: (value: Uint8Array) => {
      const contentBytes = byteSerializer.serialize(value);
      const lengthBytes = size.serialize(contentBytes.length);
      return mergeBytes([lengthBytes, contentBytes]);
    },
    deserialize: (buffer: Uint8Array, offset = 0) => {
      if (buffer.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('bytes');
      }
      const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
      const length = Number(lengthBigInt);
      offset = lengthOffset;
      const contentBuffer = buffer.slice(offset, offset + length);
      if (contentBuffer.length < length) {
        throw new NotEnoughBytesError('bytes', length, contentBuffer.length);
      }
      const [value, contentOffset] = byteSerializer.deserialize(contentBuffer);
      offset += contentOffset;
      return [value, offset];
    },
  };
}

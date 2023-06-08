import {
  StringSerializerOptions,
  Serializer,
  utf8,
  fixSerializer,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { DeserializingEmptyBufferError, NotEnoughBytesError } from './errors';
import { getSizeDescription } from './getSizeDescription';
import { u32 } from './numbers';

export function string(
  options: StringSerializerOptions = {}
): Serializer<string> {
  const size = options.size ?? u32();
  const encoding = options.encoding ?? utf8;
  const description =
    options.description ??
    `string(${encoding.description}; ${getSizeDescription(size)})`;

  if (size === 'variable') {
    return { ...encoding, description };
  }

  if (typeof size === 'number') {
    return fixSerializer(encoding, size, description);
  }

  return {
    description,
    fixedSize: null,
    maxSize: null,
    serialize: (value: string) => {
      const contentBytes = encoding.serialize(value);
      const lengthBytes = size.serialize(contentBytes.length);
      return mergeBytes([lengthBytes, contentBytes]);
    },
    deserialize: (buffer: Uint8Array, offset = 0) => {
      if (buffer.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('string');
      }
      const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
      const length = Number(lengthBigInt);
      offset = lengthOffset;
      const contentBuffer = buffer.slice(offset, offset + length);
      if (contentBuffer.length < length) {
        throw new NotEnoughBytesError('string', length, contentBuffer.length);
      }
      const [value, contentOffset] = encoding.deserialize(contentBuffer);
      offset += contentOffset;
      return [value, offset];
    },
  };
}

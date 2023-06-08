import { BoolSerializerOptions, Serializer } from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { u8 } from './numbers';

export function bool(options: BoolSerializerOptions = {}): Serializer<boolean> {
  const size = options.size ?? u8();
  if (size.fixedSize === null) {
    throw new BeetSerializerError('Serializer [bool] requires a fixed size.');
  }
  return {
    description: options.description ?? `bool(${size.description})`,
    fixedSize: size.fixedSize,
    maxSize: size.fixedSize,
    serialize: (value: boolean) => size.serialize(value ? 1 : 0),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('bool');
      }
      const [value, vOffset] = size.deserialize(bytes, offset);
      return [value === 1, vOffset];
    },
  };
}

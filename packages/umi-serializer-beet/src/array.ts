import {
  Serializer,
  ArraySerializerOptions,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { getResolvedSize } from './getResolvedSize';
import { getSizeDescription } from './getSizeDescription';
import { getSizeFromChildren } from './getSizeFromChildren';
import { getSizePrefix } from './getSizePrefix';
import { u32 } from './numbers';

export function array<T, U extends T = T>(
  item: Serializer<T, U>,
  options: ArraySerializerOptions = {}
): Serializer<T[], U[]> {
  const size = options.size ?? u32();
  if (size === 'remainder' && item.fixedSize === null) {
    throw new BeetSerializerError(
      'Serializers of "remainder" size must have fixed-size items.'
    );
  }
  return {
    description:
      options.description ??
      `array(${item.description}; ${getSizeDescription(size)})`,
    fixedSize: getSizeFromChildren(size, [item.fixedSize]),
    maxSize: getSizeFromChildren(size, [item.maxSize]),
    serialize: (value: T[]) => {
      if (typeof size === 'number' && value.length !== size) {
        throw new BeetSerializerError(
          `Expected array to have ${size} items but got ${value.length}.`
        );
      }
      return mergeBytes([
        getSizePrefix(size, value.length),
        ...value.map((v) => item.serialize(v)),
      ]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (typeof size === 'object' && bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('array', []);
      }
      const [resolvedSize, newOffset] = getResolvedSize(
        size,
        [item.fixedSize],
        bytes,
        offset
      );
      offset = newOffset;
      const values: U[] = [];
      for (let i = 0; i < resolvedSize; i += 1) {
        const [value, newOffset] = item.deserialize(bytes, offset);
        values.push(value);
        offset = newOffset;
      }
      return [values, offset];
    },
  };
}

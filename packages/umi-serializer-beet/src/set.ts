import {
  mergeBytes,
  Serializer,
  SetSerializerOptions,
} from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { getResolvedSize } from './getResolvedSize';
import { getSizeDescription } from './getSizeDescription';
import { getSizeFromChildren } from './getSizeFromChildren';
import { getSizePrefix } from './getSizePrefix';
import { u32 } from './numbers';

export function set<T, U extends T = T>(
  item: Serializer<T, U>,
  options: SetSerializerOptions = {}
): Serializer<Set<T>, Set<U>> {
  const size = options.size ?? u32();
  if (size === 'remainder' && item.fixedSize === null) {
    throw new BeetSerializerError(
      'Serializers of "remainder" size must have fixed-size items.'
    );
  }
  return {
    description:
      options.description ??
      `set(${item.description}; ${getSizeDescription(size)})`,
    fixedSize: getSizeFromChildren(size, [item.fixedSize]),
    maxSize: getSizeFromChildren(size, [item.maxSize]),
    serialize: (set: Set<T>) => {
      if (typeof size === 'number' && set.size !== size) {
        throw new BeetSerializerError(
          `Expected set to have ${size} items but got ${set.size}.`
        );
      }
      const itemBytes = Array.from(set, (value) => item.serialize(value));
      return mergeBytes([getSizePrefix(size, set.size), ...itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const set: Set<U> = new Set();
      if (typeof size === 'object' && bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('set', new Set());
      }
      const [resolvedSize, newOffset] = getResolvedSize(
        size,
        [item.fixedSize],
        bytes,
        offset
      );
      offset = newOffset;
      for (let i = 0; i < resolvedSize; i += 1) {
        const [value, newOffset] = item.deserialize(bytes, offset);
        offset = newOffset;
        set.add(value);
      }
      return [set, offset];
    },
  };
}

import {
  BaseSerializerOptions,
  ExpectedFixedSizeSerializerError,
  mergeBytes,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';
import { u32 } from '@metaplex-foundation/umi-serializers-numbers';
import { ArrayLikeSerializerSize } from './arrayLikeSerializerSize';
import {
  getResolvedSize,
  getSizeDescription,
  getSizeFromChildren,
  getSizePrefix,
} from './utils';
import { InvalidNumberOfItemsError } from './errors';

/**
 * Defines the options for `Set` serializers.
 * @category Serializers
 */
export type SetSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the set.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

/**
 * Creates a serializer for a set.
 *
 * @param item - The serializer to use for the set's items.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function set<T, U extends T = T>(
  item: Serializer<T, U>,
  options: SetSerializerOptions = {}
): Serializer<Set<T>, Set<U>> {
  const size = options.size ?? u32();
  if (size === 'remainder' && item.fixedSize === null) {
    throw new ExpectedFixedSizeSerializerError(
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
        throw new InvalidNumberOfItemsError('set', size, set.size);
      }
      const itemBytes = Array.from(set, (value) => item.serialize(value));
      return mergeBytes([getSizePrefix(size, set.size), ...itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const set: Set<U> = new Set();
      if (typeof size === 'object' && bytes.slice(offset).length === 0) {
        return [set, offset];
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

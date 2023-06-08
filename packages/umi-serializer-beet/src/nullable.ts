import {
  Serializer,
  NullableSerializerOptions,
  Nullable,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { getSizeDescription } from './getSizeDescription';
import { u8 } from './numbers';
import { sumSerializerSizes } from './sumSerializerSizes';

export function nullable<T, U extends T = T>(
  item: Serializer<T, U>,
  options: NullableSerializerOptions = {}
): Serializer<Nullable<T>, Nullable<U>> {
  const prefix = options.prefix ?? u8();
  const fixed = options.fixed ?? false;
  let descriptionSuffix = `; ${getSizeDescription(prefix)}`;
  let fixedSize = item.fixedSize === 0 ? prefix.fixedSize : null;
  if (fixed) {
    if (item.fixedSize === null || prefix.fixedSize === null) {
      throw new BeetSerializerError(
        'Fixed nullables can only be used with fixed-size serializers'
      );
    }
    descriptionSuffix += '; fixed';
    fixedSize = prefix.fixedSize + item.fixedSize;
  }
  return {
    description:
      options.description ??
      `nullable(${item.description + descriptionSuffix})`,
    fixedSize,
    maxSize: sumSerializerSizes([prefix.maxSize, item.maxSize]),
    serialize: (option: Nullable<T>) => {
      const prefixByte = prefix.serialize(Number(option !== null));
      if (fixed) {
        const itemFixedSize = item.fixedSize as number;
        const itemBytes =
          option !== null
            ? item.serialize(option).slice(0, itemFixedSize)
            : new Uint8Array(itemFixedSize).fill(0);
        return mergeBytes([prefixByte, itemBytes]);
      }
      const itemBytes =
        option !== null ? item.serialize(option) : new Uint8Array();
      return mergeBytes([prefixByte, itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('nullable', null);
      }
      const fixedOffset =
        offset + (prefix.fixedSize ?? 0) + (item.fixedSize ?? 0);
      const [isSome, prefixOffset] = prefix.deserialize(bytes, offset);
      offset = prefixOffset;
      if (isSome === 0) {
        return [null, fixed ? fixedOffset : offset];
      }
      const [value, newOffset] = item.deserialize(bytes, offset);
      offset = newOffset;
      return [value, fixed ? fixedOffset : offset];
    },
  };
}

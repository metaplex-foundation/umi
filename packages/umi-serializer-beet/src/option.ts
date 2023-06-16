import {
  Serializer,
  Option,
  OptionSerializerOptions,
  isSome,
  mergeBytes,
  none,
  some,
  Nullable,
  isOption,
  wrapNullable,
} from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { getSizeDescription } from './getSizeDescription';
import { sumSerializerSizes } from './sumSerializerSizes';
import { u8 } from './numbers';

export function option<T, U extends T = T>(
  item: Serializer<T, U>,
  options: OptionSerializerOptions = {}
): Serializer<Option<T> | Nullable<T>, Option<U>> {
  const prefix = options.prefix ?? u8();
  const fixed = options.fixed ?? false;
  let descriptionSuffix = `; ${getSizeDescription(prefix)}`;
  let fixedSize = item.fixedSize === 0 ? prefix.fixedSize : null;
  if (fixed) {
    if (item.fixedSize === null || prefix.fixedSize === null) {
      throw new BeetSerializerError(
        'Fixed options can only be used with fixed-size serializers'
      );
    }
    descriptionSuffix += '; fixed';
    fixedSize = prefix.fixedSize + item.fixedSize;
  }
  return {
    description:
      options.description ?? `option(${item.description + descriptionSuffix})`,
    fixedSize,
    maxSize: sumSerializerSizes([prefix.maxSize, item.maxSize]),
    serialize: (optionOrNullable: Option<T> | Nullable<T>) => {
      const option = isOption<T>(optionOrNullable)
        ? optionOrNullable
        : wrapNullable(optionOrNullable);

      const prefixByte = prefix.serialize(Number(isSome(option)));
      if (fixed) {
        const itemFixedSize = item.fixedSize as number;
        const itemBytes = isSome(option)
          ? item.serialize(option.value).slice(0, itemFixedSize)
          : new Uint8Array(itemFixedSize).fill(0);
        return mergeBytes([prefixByte, itemBytes]);
      }
      const itemBytes = isSome(option)
        ? item.serialize(option.value)
        : new Uint8Array();
      return mergeBytes([prefixByte, itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('option', none());
      }
      const fixedOffset =
        offset + (prefix.fixedSize ?? 0) + (item.fixedSize ?? 0);
      const [isSome, prefixOffset] = prefix.deserialize(bytes, offset);
      offset = prefixOffset;
      if (isSome === 0) {
        return [none(), fixed ? fixedOffset : offset];
      }
      const [value, newOffset] = item.deserialize(bytes, offset);
      offset = newOffset;
      return [some(value), fixed ? fixedOffset : offset];
    },
  };
}

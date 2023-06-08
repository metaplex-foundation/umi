import {
  DataEnum,
  DataEnumToSerializerTuple,
  DataEnumSerializerOptions,
  Serializer,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { maxSerializerSizes } from './maxSerializerSizes';
import { u8 } from './numbers';
import { sumSerializerSizes } from './sumSerializerSizes';

export function dataEnum<T extends DataEnum, U extends T = T>(
  variants: DataEnumToSerializerTuple<T, U>,
  options: DataEnumSerializerOptions = {}
): Serializer<T, U> {
  const prefix = options.size ?? u8();
  const fieldDescriptions = variants
    .map(
      ([name, serializer]) =>
        `${String(name)}${serializer ? `: ${serializer.description}` : ''}`
    )
    .join(', ');
  const allVariantHaveTheSameFixedSize = variants.every(
    (one, i, all) => one[1].fixedSize === all[0][1].fixedSize
  );
  const fixedVariantSize = allVariantHaveTheSameFixedSize
    ? variants[0][1].fixedSize
    : null;
  const maxVariantSize = maxSerializerSizes(
    variants.map(([, field]) => field.maxSize)
  );
  return {
    description:
      options.description ??
      `dataEnum(${fieldDescriptions}; ${prefix.description})`,
    fixedSize:
      variants.length === 0
        ? prefix.fixedSize
        : sumSerializerSizes([prefix.fixedSize, fixedVariantSize]),
    maxSize:
      variants.length === 0
        ? prefix.maxSize
        : sumSerializerSizes([prefix.maxSize, maxVariantSize]),
    serialize: (variant: T) => {
      const discriminator = variants.findIndex(
        ([key]) => variant.__kind === key
      );
      if (discriminator < 0) {
        throw new BeetSerializerError(
          `Invalid data enum variant. Got "${variant.__kind}", expected one of ` +
            `[${variants.map(([key]) => key).join(', ')}]`
        );
      }
      const variantPrefix = prefix.serialize(discriminator);
      const variantSerializer = variants[discriminator][1];
      const variantBytes = variantSerializer.serialize(variant as any);
      return mergeBytes([variantPrefix, variantBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('dataEnum');
      }
      const [discriminator, dOffset] = prefix.deserialize(bytes, offset);
      offset = dOffset;
      const variantField = variants[Number(discriminator)] ?? null;
      if (!variantField) {
        throw new BeetSerializerError(
          `Data enum index "${discriminator}" is out of range. ` +
            `Index should be between 0 and ${variants.length - 1}.`
        );
      }
      const [variant, vOffset] = variantField[1].deserialize(bytes, offset);
      offset = vOffset;
      return [{ __kind: variantField[0], ...(variant ?? {}) } as U, offset];
    },
  };
}

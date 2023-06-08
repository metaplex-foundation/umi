import {
  ScalarEnum,
  EnumSerializerOptions,
  Serializer,
} from '@metaplex-foundation/umi';
import { BeetSerializerError, DeserializingEmptyBufferError } from './errors';
import { u8 } from './numbers';

export function scalarEnum<T>(
  constructor: ScalarEnum<T> & {},
  options: EnumSerializerOptions = {}
): Serializer<T> {
  const prefix = options.size ?? u8();
  const enumKeys = Object.keys(constructor);
  const enumValues = Object.values(constructor);
  const isNumericEnum = enumValues.some((v) => typeof v === 'number');
  const valueDescriptions = enumValues
    .filter((v) => typeof v === 'string')
    .join(', ');
  const minRange = 0;
  const maxRange = isNumericEnum
    ? enumValues.length / 2 - 1
    : enumValues.length - 1;
  const stringValues: string[] = isNumericEnum
    ? [...enumKeys]
    : [...new Set([...enumKeys, ...enumValues])];
  function assertValidVariant(variant: number | string): void {
    const isInvalidNumber =
      typeof variant === 'number' && (variant < minRange || variant > maxRange);
    const isInvalidString =
      typeof variant === 'string' && !stringValues.includes(variant);
    if (isInvalidNumber || isInvalidString) {
      throw new BeetSerializerError(
        `Invalid enum variant. Got "${variant}", ` +
          `expected one of [${stringValues.join(', ')}] ` +
          `or a number between ${minRange} and ${maxRange}`
      );
    }
  }
  return {
    description:
      options.description ??
      `enum(${valueDescriptions}; ${prefix.description})`,
    fixedSize: prefix.fixedSize,
    maxSize: prefix.maxSize,
    serialize: (value: T) => {
      assertValidVariant(value as string | number);
      if (typeof value === 'number') return prefix.serialize(value);
      const valueIndex = enumValues.indexOf(value);
      if (valueIndex >= 0) return prefix.serialize(valueIndex);
      return prefix.serialize(enumKeys.indexOf(value as string));
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('enum');
      }
      const [value, newOffset] = prefix.deserialize(bytes, offset);
      const valueAsNumber = Number(value);
      offset = newOffset;
      assertValidVariant(valueAsNumber);
      return [
        (isNumericEnum ? valueAsNumber : enumValues[valueAsNumber]) as T,
        offset,
      ];
    },
  };
}

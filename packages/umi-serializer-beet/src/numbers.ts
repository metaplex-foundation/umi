import {
  Endianness,
  NumberSerializerOptions,
  Serializer,
  swapSerializerEndianness,
} from '@metaplex-foundation/umi-core';
import type { FixedSizeBeet } from '@metaplex-foundation/beet';
import * as beet from '@metaplex-foundation/beet';
import { Buffer } from 'buffer';
import { DeserializingEmptyBufferError } from './errors';

// Simple numbers.
export const u8 = (options: NumberSerializerOptions = {}) =>
  wrapBeet(beet.u8, options);
export const u16 = (options: NumberSerializerOptions = {}) =>
  wrapBeet(beet.u16, options);
export const u32 = (options: NumberSerializerOptions = {}) =>
  wrapBeet(beet.u32, options);
export const i8 = (options: NumberSerializerOptions = {}) =>
  wrapBeet(beet.i8, options);
export const i16 = (options: NumberSerializerOptions = {}) =>
  wrapBeet(beet.i16, options);
export const i32 = (options: NumberSerializerOptions = {}) =>
  wrapBeet(beet.i32, options);

// Big numbers.
export const u64 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.u64, options);
  return {
    ...serializer,
    serialize: (value: number | bigint) => {
      if (value < 0) throw new RangeError('u64 cannot be negative');
      return serializer.serialize(value);
    },
  };
};
export const u128 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.u128, options);
  return {
    ...serializer,
    serialize: (value: number | bigint) => {
      if (value < 0) throw new RangeError('u128 cannot be negative');
      return serializer.serialize(value);
    },
  };
};
export const i64 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.i64, options);
  return {
    ...serializer,
    serialize: (value: number | bigint) => {
      if (value < (-2n) ** 63n) {
        throw new RangeError('i64 cannot be lower than -2^63');
      }
      if (value > 2n ** 63n - 1n) {
        throw new RangeError('i64 cannot be greater than 2^63 - 1');
      }
      return serializer.serialize(value);
    },
  };
};
export const i128 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.i128, options);
  return {
    ...serializer,
    serialize: (value: number | bigint) => {
      if (value < (-2n) ** 127n) {
        throw new RangeError('i128 cannot be lower than -2^127');
      }
      if (value > 2n ** 127n - 1n) {
        throw new RangeError('i128 cannot be greater than 2^127 - 1');
      }
      return serializer.serialize(value);
    },
  };
};

// Helpers.
function wrapBeet<T>(
  fixedBeet: FixedSizeBeet<T>,
  options: NumberSerializerOptions = {}
): Serializer<T> {
  const serializer = {
    description: options.description ?? fixedBeet.description,
    fixedSize: fixedBeet.byteSize,
    maxSize: fixedBeet.byteSize,
    serialize: (value: T) => {
      const buffer = Buffer.alloc(fixedBeet.byteSize);
      fixedBeet.write(buffer, 0, value);
      return new Uint8Array(buffer);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError(fixedBeet.description);
      }
      const buffer = Buffer.from(bytes);
      const value = fixedBeet.read(buffer, offset);
      return [value, offset + fixedBeet.byteSize];
    },
  };

  if (options.endianness === Endianness.LittleEndian) {
    return swapSerializerEndianness<T>(serializer, 8);
  }

  return serializer;
}

function wrapBigintBeet(
  fixedBeet: FixedSizeBeet<beet.bignum>,
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> {
  const serializer = {
    description: options.description ?? fixedBeet.description,
    fixedSize: fixedBeet.byteSize,
    maxSize: fixedBeet.byteSize,
    serialize: (value: number | bigint) => {
      const buffer = Buffer.alloc(fixedBeet.byteSize);
      fixedBeet.write(buffer, 0, value);
      return new Uint8Array(buffer);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError(fixedBeet.description);
      }
      const buffer = Buffer.from(bytes);
      const rawValue = fixedBeet.read(buffer, offset);
      const value = BigInt(
        typeof rawValue === 'number' ? rawValue : rawValue.toString()
      );
      return [value, offset + fixedBeet.byteSize];
    },
  };

  if (options.endianness === Endianness.LittleEndian) {
    return swapSerializerEndianness<T>(serializer, 8);
  }

  return serializer;
}

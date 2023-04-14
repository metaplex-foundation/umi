import type { FixedSizeBeet } from '@metaplex-foundation/beet';
import * as beet from '@metaplex-foundation/beet';
import {
  Endian,
  NumberSerializerOptions,
  reverseSerializer,
  Serializer,
} from '@metaplex-foundation/umi';
import { Buffer } from 'buffer';
import {
  DeserializingEmptyBufferError,
  OperationNotSupportedError,
} from './errors';

// Helpers.
const wrapBeet =
  <T>(fixedBeet: FixedSizeBeet<T>) =>
  (options: NumberSerializerOptions = {}): Serializer<T> => {
    const isBigEndian = options.endian === Endian.Big;
    let defaultDescription = fixedBeet.description;
    if (fixedBeet.byteSize > 1) {
      defaultDescription += isBigEndian ? '(be)' : '(le)';
    }
    const serializer: Serializer<T> = {
      description: options.description ?? defaultDescription,
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

    return isBigEndian ? reverseSerializer(serializer) : serializer;
  };

const wrapBigintBeet =
  (fixedBeet: FixedSizeBeet<beet.bignum>) =>
  (
    options: NumberSerializerOptions = {}
  ): Serializer<number | bigint, bigint> => {
    const isBigEndian = options.endian === Endian.Big;
    const serializer: Serializer<number | bigint, bigint> = {
      description:
        options.description ??
        fixedBeet.description + (isBigEndian ? '(be)' : '(le)'),
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

    return isBigEndian ? reverseSerializer(serializer) : serializer;
  };

// Simple numbers.
export const u8 = wrapBeet(beet.u8);
export const u16 = wrapBeet(beet.u16);
export const u32 = wrapBeet(beet.u32);
export const i8 = wrapBeet(beet.i8);
export const i16 = wrapBeet(beet.i16);
export const i32 = wrapBeet(beet.i32);

// Big numbers.
export const u64 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.u64)(options);
  return {
    ...serializer,
    serialize: (value: number | bigint) => {
      if (value < 0) throw new RangeError('u64 cannot be negative');
      return serializer.serialize(value);
    },
  };
};
export const u128 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.u128)(options);
  return {
    ...serializer,
    serialize: (value: number | bigint) => {
      if (value < 0) throw new RangeError('u128 cannot be negative');
      return serializer.serialize(value);
    },
  };
};
export const i64 = (options: NumberSerializerOptions = {}) => {
  const serializer = wrapBigintBeet(beet.i64)(options);
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
  const serializer = wrapBigintBeet(beet.i128)(options);
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

export const f32 = (): Serializer<number> => ({
  description: 'f32 [not supported]',
  fixedSize: 4,
  maxSize: 4,
  serialize: () => {
    throw new OperationNotSupportedError('f32');
  },
  deserialize: () => {
    throw new OperationNotSupportedError('f32');
  },
});

export const f64 = (): Serializer<number> => ({
  description: 'f64 [not supported]',
  fixedSize: 8,
  maxSize: 8,
  serialize: () => {
    throw new OperationNotSupportedError('f64');
  },
  deserialize: () => {
    throw new OperationNotSupportedError('f64');
  },
});

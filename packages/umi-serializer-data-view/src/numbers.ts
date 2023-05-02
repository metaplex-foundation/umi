/* eslint-disable no-bitwise */
import {
  Endian,
  NumberSerializerOptions,
  Serializer,
  SingleByteNumberSerializerOptions,
} from '@metaplex-foundation/umi';
import {
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
  NumberOutOfRangeError,
} from './errors';
import { UInt8ArrayToBuffer } from './helpers';

const assertRange = (
  serializer: string,
  min: number | bigint,
  max: number | bigint,
  value: number | bigint
) => {
  if (value < min || value > max) {
    throw new NumberOutOfRangeError(serializer, min, max, value);
  }
};

const assertEnoughBytes = (
  serializer: string,
  bytes: Uint8Array,
  expected: number
) => {
  if (bytes.length === 0) {
    throw new DeserializingEmptyBufferError(serializer);
  }
  if (bytes.length < expected) {
    throw new NotEnoughBytesError(serializer, expected, bytes.length);
  }
};

export const u8 = (
  options: SingleByteNumberSerializerOptions = {}
): Serializer<number> => ({
  description: options.description ?? 'u8',
  fixedSize: 1,
  maxSize: 1,
  serialize(value: number): Uint8Array {
    assertRange('u8', 0, Number('0xff'), value);
    const buffer = new ArrayBuffer(1);
    new DataView(buffer).setUint8(0, value);
    return new Uint8Array(buffer);
  },
  deserialize(bytes, offset = 0): [number, number] {
    assertEnoughBytes('u8', bytes.slice(offset), 1);
    const view = new DataView(
      UInt8ArrayToBuffer(bytes.slice(offset, offset + 1))
    );
    return [view.getUint8(0), offset + 1];
  },
});

export const i8 = (
  options: SingleByteNumberSerializerOptions = {}
): Serializer<number> => ({
  description: options.description ?? 'i8',
  fixedSize: 1,
  maxSize: 1,
  serialize(value: number): Uint8Array {
    const half = Number('0x7f');
    assertRange('i8', -half - 1, half, value);
    const buffer = new ArrayBuffer(1);
    new DataView(buffer).setInt8(0, value);
    return new Uint8Array(buffer);
  },
  deserialize(bytes, offset = 0): [number, number] {
    assertEnoughBytes('i8', bytes.slice(offset), 1);
    const view = new DataView(
      UInt8ArrayToBuffer(bytes.slice(offset, offset + 1))
    );
    return [view.getInt8(0), offset + 1];
  },
});

export const u16 = (
  options: NumberSerializerOptions = {}
): Serializer<number> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'u16(le)' : 'u16(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 2,
    maxSize: 2,
    serialize(value: number): Uint8Array {
      assertRange('u16', 0, Number('0xffff'), value);
      const buffer = new ArrayBuffer(2);
      new DataView(buffer).setUint16(0, value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number, number] {
      assertEnoughBytes('u16', bytes.slice(offset), 2);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 2))
      );
      return [view.getUint16(0, littleEndian), offset + 2];
    },
  };
};

export const i16 = (
  options: NumberSerializerOptions = {}
): Serializer<number> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'i16(le)' : 'i16(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 2,
    maxSize: 2,
    serialize(value: number): Uint8Array {
      const half = Number('0x7fff');
      assertRange('i16', -half - 1, half, value);
      const buffer = new ArrayBuffer(2);
      new DataView(buffer).setInt16(0, value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number, number] {
      assertEnoughBytes('i16', bytes.slice(offset), 2);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 2))
      );
      return [view.getInt16(0, littleEndian), offset + 2];
    },
  };
};

export const u32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'u32(le)' : 'u32(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 4,
    maxSize: 4,
    serialize(value: number): Uint8Array {
      assertRange('u32', 0, Number('0xffffffff'), value);
      const buffer = new ArrayBuffer(4);
      new DataView(buffer).setUint32(0, value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number, number] {
      assertEnoughBytes('u32', bytes.slice(offset), 4);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 4))
      );
      return [view.getUint32(0, littleEndian), offset + 4];
    },
  };
};

export const i32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'i32(le)' : 'i32(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 4,
    maxSize: 4,
    serialize(value: number): Uint8Array {
      const half = Number('0x7fffffff');
      assertRange('i32', -half - 1, half, value);
      const buffer = new ArrayBuffer(4);
      new DataView(buffer).setInt32(0, value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number, number] {
      assertEnoughBytes('i32', bytes.slice(offset), 4);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 4))
      );
      return [view.getInt32(0, littleEndian), offset + 4];
    },
  };
};

export const u64 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'u64(le)' : 'u64(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 8,
    maxSize: 8,
    serialize(value: number | bigint): Uint8Array {
      const valueBigInt = BigInt(value);
      assertRange('u64', 0, BigInt('0xffffffffffffffff'), valueBigInt);
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setBigUint64(0, valueBigInt, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [bigint, number] {
      assertEnoughBytes('u64', bytes.slice(offset), 8);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 8))
      );
      return [view.getBigUint64(0, littleEndian), offset + 8];
    },
  };
};

export const i64 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'i64(le)' : 'i64(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 8,
    maxSize: 8,
    serialize(value: number | bigint): Uint8Array {
      const valueBigInt = BigInt(value);
      const half = BigInt('0x7fffffffffffffff');
      assertRange('i64', -half - 1n, half, valueBigInt);
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setBigInt64(0, valueBigInt, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [bigint, number] {
      assertEnoughBytes('i64', bytes.slice(offset), 8);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 8))
      );
      return [view.getBigInt64(0, littleEndian), offset + 8];
    },
  };
};

export const u128 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'u128(le)' : 'u128(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 16,
    maxSize: 16,
    serialize(value: number | bigint): Uint8Array {
      const valueBigInt = BigInt(value);
      const max = BigInt('0xffffffffffffffffffffffffffffffff');
      assertRange('u128', 0, max, valueBigInt);
      const buffer = new ArrayBuffer(16);
      const view = new DataView(buffer);
      const leftOffset = littleEndian ? 8 : 0;
      const rightOffset = littleEndian ? 0 : 8;
      const rightMask = 0xffffffffffffffffn;
      view.setBigUint64(leftOffset, valueBigInt >> 64n, littleEndian);
      view.setBigUint64(rightOffset, valueBigInt & rightMask, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [bigint, number] {
      assertEnoughBytes('u128', bytes.slice(offset), 16);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 16))
      );
      const leftOffset = littleEndian ? 8 : 0;
      const rightOffset = littleEndian ? 0 : 8;
      const left = view.getBigUint64(leftOffset, littleEndian);
      const right = view.getBigUint64(rightOffset, littleEndian);
      return [(left << 64n) + right, offset + 16];
    },
  };
};

export const i128 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'i128(le)' : 'i128(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 16,
    maxSize: 16,
    serialize(value: number | bigint): Uint8Array {
      const valueBigInt = BigInt(value);
      const half = BigInt('0x7fffffffffffffffffffffffffffffff');
      assertRange('i128', -half - 1n, half, valueBigInt);
      const buffer = new ArrayBuffer(16);
      const view = new DataView(buffer);
      const leftOffset = littleEndian ? 8 : 0;
      const rightOffset = littleEndian ? 0 : 8;
      const rightMask = 0xffffffffffffffffn;
      view.setBigInt64(leftOffset, valueBigInt >> 64n, littleEndian);
      view.setBigUint64(rightOffset, valueBigInt & rightMask, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [bigint, number] {
      assertEnoughBytes('i128', bytes.slice(offset), 16);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 16))
      );
      const leftOffset = littleEndian ? 8 : 0;
      const rightOffset = littleEndian ? 0 : 8;
      const left = view.getBigInt64(leftOffset, littleEndian);
      const right = view.getBigUint64(rightOffset, littleEndian);
      return [(left << 64n) + right, offset + 16];
    },
  };
};

export const f32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'f32(le)' : 'f32(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 4,
    maxSize: 4,
    serialize(value: number): Uint8Array {
      const buffer = new ArrayBuffer(4);
      new DataView(buffer).setFloat32(0, value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number, number] {
      assertEnoughBytes('f32', bytes.slice(offset), 4);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 4))
      );
      return [view.getFloat32(0, littleEndian), offset + 4];
    },
  };
};

export const f64 = (
  options: NumberSerializerOptions = {}
): Serializer<number> => {
  const littleEndian = (options.endian ?? Endian.Little) === Endian.Little;
  const defaultDescription = littleEndian ? 'f64(le)' : 'f64(be)';
  return {
    description: options.description ?? defaultDescription,
    fixedSize: 8,
    maxSize: 8,
    serialize(value: number): Uint8Array {
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setFloat64(0, value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number, number] {
      assertEnoughBytes('f64', bytes.slice(offset), 8);
      const view = new DataView(
        UInt8ArrayToBuffer(bytes.slice(offset, offset + 8))
      );
      return [view.getFloat64(0, littleEndian), offset + 8];
    },
  };
};

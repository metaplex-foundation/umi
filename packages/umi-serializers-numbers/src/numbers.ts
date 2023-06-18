/* eslint-disable no-bitwise */
import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import {
  NumberSerializerOptions,
  SingleByteNumberSerializerOptions,
} from './common';
import { numberFactory } from './utils';

export const u8 = (
  options: SingleByteNumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'u8',
    size: 1,
    range: [0, Number('0xff')],
    set: (view, value) => view.setUint8(0, Number(value)),
    get: (view) => view.getUint8(0),
    options,
  });

export const i8 = (
  options: SingleByteNumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'i8',
    size: 1,
    range: [-Number('0x7f') - 1, Number('0x7f')],
    set: (view, value) => view.setInt8(0, Number(value)),
    get: (view) => view.getInt8(0),
    options,
  });

export const u16 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'u16',
    size: 2,
    range: [0, Number('0xffff')],
    set: (view, value, le) => view.setUint16(0, Number(value), le),
    get: (view, le) => view.getUint16(0, le),
    options,
  });

export const i16 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'i16',
    size: 2,
    range: [-Number('0x7fff') - 1, Number('0x7fff')],
    set: (view, value, le) => view.setInt16(0, Number(value), le),
    get: (view, le) => view.getInt16(0, le),
    options,
  });

export const u32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'u32',
    size: 4,
    range: [0, Number('0xffffffff')],
    set: (view, value, le) => view.setUint32(0, Number(value), le),
    get: (view, le) => view.getUint32(0, le),
    options,
  });

export const i32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'i32',
    size: 4,
    range: [-Number('0x7fffffff') - 1, Number('0x7fffffff')],
    set: (view, value, le) => view.setInt32(0, Number(value), le),
    get: (view, le) => view.getInt32(0, le),
    options,
  });

export const u64 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'u64',
    size: 8,
    range: [0, BigInt('0xffffffffffffffff')],
    set: (view, value, le) => view.setBigUint64(0, BigInt(value), le),
    get: (view, le) => view.getBigUint64(0, le),
    options,
  });

export const i64 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'i64',
    size: 8,
    range: [-BigInt('0x7fffffffffffffff') - 1n, BigInt('0x7fffffffffffffff')],
    set: (view, value, le) => view.setBigInt64(0, BigInt(value), le),
    get: (view, le) => view.getBigInt64(0, le),
    options,
  });

export const u128 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'u128',
    size: 16,
    range: [0, BigInt('0xffffffffffffffffffffffffffffffff')],
    set: (view, value, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const rightMask = 0xffffffffffffffffn;
      view.setBigUint64(leftOffset, BigInt(value) >> 64n, le);
      view.setBigUint64(rightOffset, BigInt(value) & rightMask, le);
    },
    get: (view, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const left = view.getBigUint64(leftOffset, le);
      const right = view.getBigUint64(rightOffset, le);
      return (left << 64n) + right;
    },
    options,
  });

export const i128 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'i128',
    size: 16,
    range: [
      -BigInt('0x7fffffffffffffffffffffffffffffff') - 1n,
      BigInt('0x7fffffffffffffffffffffffffffffff'),
    ],
    set: (view, value, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const rightMask = 0xffffffffffffffffn;
      view.setBigInt64(leftOffset, BigInt(value) >> 64n, le);
      view.setBigUint64(rightOffset, BigInt(value) & rightMask, le);
    },
    get: (view, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const left = view.getBigInt64(leftOffset, le);
      const right = view.getBigUint64(rightOffset, le);
      return (left << 64n) + right;
    },
    options,
  });

export const f32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'f32',
    size: 4,
    set: (view, value, le) => view.setFloat32(0, Number(value), le),
    get: (view, le) => view.getFloat32(0, le),
    options,
  });

export const f64 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'f64',
    size: 8,
    set: (view, value, le) => view.setFloat64(0, Number(value), le),
    get: (view, le) => view.getFloat64(0, le),
    options,
  });

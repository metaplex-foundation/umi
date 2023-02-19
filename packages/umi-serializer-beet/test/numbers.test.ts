import test, { Assertions } from 'ava';
import {
  Endianness,
  NumberSerializer,
  NumberSerializerOptions,
  Serializer,
} from '@metaplex-foundation/umi-core';
import { BeetSerializer } from '../src';
import { s as baseS, d as baseD } from './_helpers';

test('serialization', (t) => {
  const serializer = new BeetSerializer();
  testIntegerSerialization(t, serializer.u8);
  testIntegerSerialization(t, serializer.u16);
  testIntegerSerialization(t, serializer.u32);
  testIntegerSerialization(t, serializer.u64);
  testIntegerSerialization(t, serializer.u128);
  testIntegerSerialization(t, serializer.i8);
  testIntegerSerialization(t, serializer.i16);
  testIntegerSerialization(t, serializer.i32);
  testIntegerSerialization(t, serializer.i64);
  testIntegerSerialization(t, serializer.i128);
});

function testIntegerSerialization(
  t: Assertions,
  int: (options?: NumberSerializerOptions) => NumberSerializer
) {
  t.true(typeof int().fixedSize === 'number');
  const bytes = int().fixedSize as number;
  const unsigned = int().description.startsWith('u');
  const intBE = int();
  const intLE = int({ endianness: Endianness.LittleEndian });

  s(t, intBE, 0n, '00'.repeat(bytes));
  s(t, intLE, 0n, '00'.repeat(bytes));

  s(t, intBE, 1n, `01${'00'.repeat(bytes - 1)}`);
  s(t, intLE, 1n, `${'00'.repeat(bytes - 1)}01`);

  s(t, intBE, 42n, `2a${'00'.repeat(bytes - 1)}`);
  s(t, intLE, 42n, `${'00'.repeat(bytes - 1)}2a`);

  if (unsigned && bytes >= 2) {
    const half = BigInt(`0x${'ff'.repeat(bytes / 2)}`);
    s(t, intBE, half, `${'ff'.repeat(bytes / 2)}${'00'.repeat(bytes / 2)}`);
    s(t, intLE, half, `${'00'.repeat(bytes / 2)}${'ff'.repeat(bytes / 2)}`);
  }

  const maxBytes = BigInt(`0x${'ff'.repeat(bytes)}`);
  const min = unsigned ? 0n : -(maxBytes / 2n) - 1n;
  const max = unsigned ? maxBytes : maxBytes / 2n;

  if (!unsigned) {
    s(t, intBE, min, `${'00'.repeat(bytes - 1)}80`);
    s(t, intLE, min, `80${'00'.repeat(bytes - 1)}`);

    if (bytes >= 2) {
      s(t, intBE, min + 1n, `01${'00'.repeat(bytes - 2)}80`);
      s(t, intLE, min + 1n, `80${'00'.repeat(bytes - 2)}01`);
    } else {
      s(t, intBE, min + 1n, '81');
      s(t, intLE, min + 1n, '81');
    }
  }

  const lastByte = unsigned ? 'ff' : '7f';
  s(t, intBE, max, `${'ff'.repeat(bytes - 1)}${lastByte}`);
  s(t, intLE, max, `${lastByte}${'ff'.repeat(bytes - 1)}`);

  if (bytes >= 2) {
    s(t, intBE, max - 1n, `fe${'ff'.repeat(bytes - 2)}${lastByte}`);
    s(t, intLE, max - 1n, `${lastByte}${'ff'.repeat(bytes - 2)}fe`);
  } else {
    s(t, intBE, max - 1n, unsigned ? 'fe' : '7e');
    s(t, intLE, max - 1n, unsigned ? 'fe' : '7e');
  }

  sThrows<RangeError>(t, intBE, min - 1n);
  sThrows<RangeError>(t, intLE, min - 1n);
  sThrows<RangeError>(t, intBE, max + 1n);
  sThrows<RangeError>(t, intLE, max + 1n);
}

test('deserialization', (t) => {
  const serializer = new BeetSerializer();
  testIntegerDeserialization(t, serializer.u8);
  // testIntegerDeserialization(t, serializer.u16);
  // testIntegerDeserialization(t, serializer.u32);
  // testIntegerDeserialization(t, serializer.u64);
  // testIntegerDeserialization(t, serializer.u128);
  // testIntegerDeserialization(t, serializer.i8);
  // testIntegerDeserialization(t, serializer.i16);
  // testIntegerDeserialization(t, serializer.i32);
  // testIntegerDeserialization(t, serializer.i64);
  // testIntegerDeserialization(t, serializer.i128);
});

function testIntegerDeserialization(
  t: Assertions,
  int: (options?: NumberSerializerOptions) => NumberSerializer
) {
  t.true(typeof int().fixedSize === 'number');
  const bytes = int().fixedSize as number;
  // const unsigned = int().description.startsWith('u');
  const intBE = int();
  const intLE = int({ endianness: Endianness.LittleEndian });

  d(t, intBE, '00'.repeat(bytes), 0n, bytes);
  d(t, intLE, '00'.repeat(bytes), 0n, bytes);

  d(t, intBE, `01${'00'.repeat(bytes - 1)}`, 1n, bytes);
  d(t, intLE, `${'00'.repeat(bytes - 1)}01`, 1n, bytes);

  d(t, intBE, [`ffffff01${'00'.repeat(bytes - 1)}`, 2], 1n, bytes + 3);
  d(t, intLE, [`ffffff${'00'.repeat(bytes - 1)}01`, 2], 1n, bytes + 3);

  // s(t, intBE, 42n, `2a${'00'.repeat(bytes - 1)}`);
  // s(t, intLE, 42n, `${'00'.repeat(bytes - 1)}2a`);

  // if (unsigned && bytes >= 2) {
  //   const half = BigInt(`0x${'ff'.repeat(bytes / 2)}`);
  //   s(t, intBE, half, `${'ff'.repeat(bytes / 2)}${'00'.repeat(bytes / 2)}`);
  //   s(t, intLE, half, `${'00'.repeat(bytes / 2)}${'ff'.repeat(bytes / 2)}`);
  // }

  // const maxBytes = BigInt(`0x${'ff'.repeat(bytes)}`);
  // const min = unsigned ? 0n : -(maxBytes / 2n) - 1n;
  // const max = unsigned ? maxBytes : maxBytes / 2n;

  // if (!unsigned) {
  //   s(t, intBE, min, `${'00'.repeat(bytes - 1)}80`);
  //   s(t, intLE, min, `80${'00'.repeat(bytes - 1)}`);

  //   if (bytes >= 2) {
  //     s(t, intBE, min + 1n, `01${'00'.repeat(bytes - 2)}80`);
  //     s(t, intLE, min + 1n, `80${'00'.repeat(bytes - 2)}01`);
  //   } else {
  //     s(t, intBE, min + 1n, '81');
  //     s(t, intLE, min + 1n, '81');
  //   }
  // }

  // const lastByte = unsigned ? 'ff' : '7f';
  // s(t, intBE, max, `${'ff'.repeat(bytes - 1)}${lastByte}`);
  // s(t, intLE, max, `${lastByte}${'ff'.repeat(bytes - 1)}`);

  // if (bytes >= 2) {
  //   s(t, intBE, max - 1n, `fe${'ff'.repeat(bytes - 2)}${lastByte}`);
  //   s(t, intLE, max - 1n, `${lastByte}${'ff'.repeat(bytes - 2)}fe`);
  // } else {
  //   s(t, intBE, max - 1n, unsigned ? 'fe' : '7e');
  //   s(t, intLE, max - 1n, unsigned ? 'fe' : '7e');
  // }

  // sThrows<RangeError>(t, intBE, min - 1n);
  // sThrows<RangeError>(t, intLE, min - 1n);
  // sThrows<RangeError>(t, intBE, max + 1n);
  // sThrows<RangeError>(t, intLE, max + 1n);
}

test.skip('description', (t) => {
  const { bool, u32 } = new BeetSerializer();
  t.is(bool().description, 'bool(u8)');
  t.is(bool({ size: u32() }).description, 'bool(u32)');
  t.is(bool({ description: 'My bool' }).description, 'My bool');
});

test.skip('sizes', (t) => {
  const { bool, u32 } = new BeetSerializer();
  t.is(bool().fixedSize, 1);
  t.is(bool().maxSize, 1);
  t.is(bool({ size: u32() }).fixedSize, 4);
  t.is(bool({ size: u32() }).maxSize, 4);
});

function s(
  t: Assertions,
  serializer: NumberSerializer,
  value: bigint,
  expected: string
): void {
  const bytes = serializer.fixedSize as number;
  if (bytes <= 4) {
    baseS(t, serializer as Serializer<number>, Number(value), expected);
  } else {
    baseS(
      t,
      serializer as Serializer<number | bigint, bigint>,
      value,
      expected
    );
  }
}

function sThrows<T extends Error>(
  t: Assertions,
  serializer: NumberSerializer,
  value: bigint
): T | undefined {
  const bytes = serializer.fixedSize as number;
  if (bytes <= 4) {
    return t.throws<T>(() => serializer.serialize(Number(value)));
  }
  return t.throws<T>(() =>
    (serializer as Serializer<number | bigint, bigint>).serialize(value)
  );
}

function d(
  t: Assertions,
  serializer: NumberSerializer,
  hexBytes: string | [string, number],
  expected: bigint,
  expectedOffset?: number
): void {
  const bytes = serializer.fixedSize as number;
  if (bytes <= 4) {
    baseD(
      t,
      serializer as Serializer<number>,
      hexBytes,
      Number(expected),
      expectedOffset
    );
  } else {
    baseD(
      t,
      serializer as Serializer<number | bigint, bigint>,
      hexBytes,
      expected,
      expectedOffset
    );
  }
}

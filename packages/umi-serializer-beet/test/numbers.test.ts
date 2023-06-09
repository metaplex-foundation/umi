import {
  Endian,
  NumberSerializer,
  NumberSerializerOptions,
  Serializer,
} from '@metaplex-foundation/umi';
import test, { Assertions } from 'ava';
import { OperationNotSupportedError } from '../src';
import { d as baseD, s as baseS } from './_helpers';
import {
  u8,
  u16,
  u32,
  u64,
  u128,
  i8,
  i16,
  i32,
  i64,
  i128,
  f32,
  f64,
  shortU16,
} from '../src/numbers';

test('serialization', (t) => {
  testIntegerSerialization(t, u8);
  testIntegerSerialization(t, u16);
  testIntegerSerialization(t, u32);
  testIntegerSerialization(t, u64);
  testIntegerSerialization(t, u128);
  testIntegerSerialization(t, i8);
  testIntegerSerialization(t, i16);
  testIntegerSerialization(t, i32);
  testIntegerSerialization(t, i64);
  testIntegerSerialization(t, i128);
});

function testIntegerSerialization(
  t: Assertions,
  int: (options?: NumberSerializerOptions) => NumberSerializer
) {
  t.true(typeof int().fixedSize === 'number');
  const bytes = int().fixedSize as number;
  const unsigned = int().description.startsWith('u');
  const intLE = int();
  const intBE = int({ endian: Endian.Big });

  s(t, intLE, 0n, '00'.repeat(bytes));
  s(t, intBE, 0n, '00'.repeat(bytes));

  s(t, intLE, 1n, `01${'00'.repeat(bytes - 1)}`);
  s(t, intBE, 1n, `${'00'.repeat(bytes - 1)}01`);

  s(t, intLE, 42n, `2a${'00'.repeat(bytes - 1)}`);
  s(t, intBE, 42n, `${'00'.repeat(bytes - 1)}2a`);

  if (unsigned && bytes >= 2) {
    const half = BigInt(`0x${'ff'.repeat(bytes / 2)}`);
    s(t, intLE, half, `${'ff'.repeat(bytes / 2)}${'00'.repeat(bytes / 2)}`);
    s(t, intBE, half, `${'00'.repeat(bytes / 2)}${'ff'.repeat(bytes / 2)}`);
  }

  const maxBytes = BigInt(`0x${'ff'.repeat(bytes)}`);
  const min = unsigned ? 0n : -(maxBytes / 2n) - 1n;
  const max = unsigned ? maxBytes : maxBytes / 2n;

  if (!unsigned) {
    s(t, intLE, min, `${'00'.repeat(bytes - 1)}80`);
    s(t, intBE, min, `80${'00'.repeat(bytes - 1)}`);

    if (bytes >= 2) {
      s(t, intLE, min + 1n, `01${'00'.repeat(bytes - 2)}80`);
      s(t, intBE, min + 1n, `80${'00'.repeat(bytes - 2)}01`);
    } else {
      s(t, intLE, min + 1n, '81');
      s(t, intBE, min + 1n, '81');
    }
  }

  const lastByte = unsigned ? 'ff' : '7f';
  s(t, intLE, max, `${'ff'.repeat(bytes - 1)}${lastByte}`);
  s(t, intBE, max, `${lastByte}${'ff'.repeat(bytes - 1)}`);

  if (bytes >= 2) {
    s(t, intLE, max - 1n, `fe${'ff'.repeat(bytes - 2)}${lastByte}`);
    s(t, intBE, max - 1n, `${lastByte}${'ff'.repeat(bytes - 2)}fe`);
  } else {
    s(t, intLE, max - 1n, unsigned ? 'fe' : '7e');
    s(t, intBE, max - 1n, unsigned ? 'fe' : '7e');
  }

  sThrows<RangeError>(t, intLE, min - 1n);
  sThrows<RangeError>(t, intBE, min - 1n);
  sThrows<RangeError>(t, intLE, max + 1n);
  sThrows<RangeError>(t, intBE, max + 1n);
}

test('deserialization', (t) => {
  testIntegerDeserialization(t, u8);
  testIntegerDeserialization(t, u16);
  testIntegerDeserialization(t, u32);
  testIntegerDeserialization(t, u64);
  testIntegerDeserialization(t, u128);
  testIntegerDeserialization(t, i8);
  testIntegerDeserialization(t, i16);
  testIntegerDeserialization(t, i32);
  testIntegerDeserialization(t, i64);
  testIntegerDeserialization(t, i128);
});

function testIntegerDeserialization(
  t: Assertions,
  int: (options?: NumberSerializerOptions) => NumberSerializer
) {
  t.true(typeof int().fixedSize === 'number');
  const bytes = int().fixedSize as number;
  const unsigned = int().description.startsWith('u');
  const intLE = int();
  const intBE = int({ endian: Endian.Big });

  d(t, intLE, '00'.repeat(bytes), 0n, bytes);
  d(t, intBE, '00'.repeat(bytes), 0n, bytes);

  d(t, intLE, `01${'00'.repeat(bytes - 1)}`, 1n, bytes);
  d(t, intBE, `${'00'.repeat(bytes - 1)}01`, 1n, bytes);

  d(t, intLE, [`ffffff01${'00'.repeat(bytes - 1)}`, 3], 1n, bytes + 3);
  d(t, intBE, [`ffffff${'00'.repeat(bytes - 1)}01`, 3], 1n, bytes + 3);

  d(t, intLE, `2a${'00'.repeat(bytes - 1)}`, 42n, bytes);
  d(t, intBE, `${'00'.repeat(bytes - 1)}2a`, 42n, bytes);

  if (unsigned && bytes >= 2) {
    const half = BigInt(`0x${'ff'.repeat(bytes / 2)}`);
    d(t, intLE, `${'ff'.repeat(bytes / 2)}${'00'.repeat(bytes / 2)}`, half);
    d(t, intBE, `${'00'.repeat(bytes / 2)}${'ff'.repeat(bytes / 2)}`, half);
  }

  const maxBytes = BigInt(`0x${'ff'.repeat(bytes)}`);
  const min = unsigned ? 0n : -(maxBytes / 2n) - 1n;
  const max = unsigned ? maxBytes : maxBytes / 2n;

  if (!unsigned) {
    d(t, intLE, `${'00'.repeat(bytes - 1)}80`, min);
    d(t, intBE, `80${'00'.repeat(bytes - 1)}`, min);

    if (bytes >= 2) {
      d(t, intLE, `01${'00'.repeat(bytes - 2)}80`, min + 1n);
      d(t, intBE, `80${'00'.repeat(bytes - 2)}01`, min + 1n);
    } else {
      d(t, intLE, '81', min + 1n);
      d(t, intBE, '81', min + 1n);
    }
  }

  const lastByte = unsigned ? 'ff' : '7f';
  d(t, intLE, `${'ff'.repeat(bytes - 1)}${lastByte}`, max, bytes);
  d(t, intBE, `${lastByte}${'ff'.repeat(bytes - 1)}`, max, bytes);

  if (bytes >= 2) {
    d(t, intLE, `fe${'ff'.repeat(bytes - 2)}${lastByte}`, max - 1n);
    d(t, intBE, `${lastByte}${'ff'.repeat(bytes - 2)}fe`, max - 1n);
  } else {
    d(t, intLE, unsigned ? 'fe' : '7e', max - 1n);
    d(t, intBE, unsigned ? 'fe' : '7e', max - 1n);
  }
}

test('shortU16 serialization', (t) => {
  s(t, shortU16(), 0n, '00');
  s(t, shortU16(), 127n, '7f');
  s(t, shortU16(), 128n, '8001');
  s(t, shortU16(), 16383n, 'ff7f');
  s(t, shortU16(), 16384n, '808001');
  s(t, shortU16(), 65535n, 'ffff03');

  t.throws(() => {
    shortU16().serialize(-1);
  });
  t.throws(() => {
    shortU16().serialize(65536);
  });

  for (let ii = 0; ii <= 0b1111111111111111; ii += 1) {
    const buffer = shortU16().serialize(ii);
    t.is(shortU16().deserialize(buffer)[0], ii);
  }
});

test('description', (t) => {
  // Little endian.
  t.is(u8().description, 'u8');
  t.is(u16().description, 'u16(le)');
  t.is(shortU16().description, 'shortU16');
  t.is(u32().description, 'u32(le)');
  t.is(u64().description, 'u64(le)');
  t.is(u128().description, 'u128(le)');
  t.is(i8().description, 'i8');
  t.is(i16().description, 'i16(le)');
  t.is(i32().description, 'i32(le)');
  t.is(i64().description, 'i64(le)');
  t.is(i128().description, 'i128(le)');

  // Big endian.
  const beOptions = { endian: Endian.Big };
  t.is(u8().description, 'u8');
  t.is(u16(beOptions).description, 'u16(be)');
  t.is(u32(beOptions).description, 'u32(be)');
  t.is(u64(beOptions).description, 'u64(be)');
  t.is(u128(beOptions).description, 'u128(be)');
  t.is(i8().description, 'i8');
  t.is(i16(beOptions).description, 'i16(be)');
  t.is(i32(beOptions).description, 'i32(be)');
  t.is(i64(beOptions).description, 'i64(be)');
  t.is(i128(beOptions).description, 'i128(be)');

  // Custom description.
  t.is(
    u8({ description: 'My Custom Description' }).description,
    'My Custom Description'
  );
});

test('sizes', (t) => {
  t.is(u8().fixedSize, 1);
  t.is(u8().maxSize, 1);
  t.is(u16().fixedSize, 2);
  t.is(u16().maxSize, 2);
  t.is(shortU16().fixedSize, null);
  t.is(shortU16().maxSize, 3);
  t.is(u32().fixedSize, 4);
  t.is(u32().maxSize, 4);
  t.is(u64().fixedSize, 8);
  t.is(u64().maxSize, 8);
  t.is(u128().fixedSize, 16);
  t.is(u128().maxSize, 16);
  t.is(i8().fixedSize, 1);
  t.is(i8().maxSize, 1);
  t.is(i16().fixedSize, 2);
  t.is(i16().maxSize, 2);
  t.is(i32().fixedSize, 4);
  t.is(i32().maxSize, 4);
  t.is(i64().fixedSize, 8);
  t.is(i64().maxSize, 8);
  t.is(i128().fixedSize, 16);
  t.is(i128().maxSize, 16);
});

test('it cannot serialize float numbers', (t) => {
  const b = new Uint8Array([0]);
  const e = { name: 'OperationNotSupportedError' };
  t.throws<OperationNotSupportedError>(() => f32().serialize(1.5), e);
  t.throws<OperationNotSupportedError>(() => f32().deserialize(b), e);
  t.throws<OperationNotSupportedError>(() => f64().serialize(42.6), e);
  t.throws<OperationNotSupportedError>(() => f64().deserialize(b), e);
  t.is(f32().fixedSize, 4);
  t.is(f32().maxSize, 4);
  t.is(f64().fixedSize, 8);
  t.is(f64().maxSize, 8);
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

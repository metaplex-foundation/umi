import test from 'ava';
import { Endian, u64 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = 0n;
const MAX = BigInt('0xffffffffffffffff');
const HALF = BigInt('0xffffffff');

test('serialization', (t) => {
  const u64LE = u64();
  const u64BE = u64({ endian: Endian.Big });

  assertValid(t, u64LE, 1n, '0100000000000000');
  assertValid(t, u64BE, 1n, '0000000000000001');
  assertValid(t, u64LE, 42n, '2a00000000000000');
  assertValid(t, u64BE, 42n, '000000000000002a');

  // Half bytes.
  assertValid(t, u64LE, HALF, 'ffffffff00000000');
  assertValid(t, u64BE, HALF, '00000000ffffffff');

  // Pre-boundaries.
  assertValid(t, u64LE, MIN + 1n, '0100000000000000');
  assertValid(t, u64BE, MIN + 1n, '0000000000000001');
  assertValid(t, u64LE, MAX - 1n, 'feffffffffffffff');
  assertValid(t, u64BE, MAX - 1n, 'fffffffffffffffe');

  // Boundaries.
  assertValid(t, u64LE, MIN, '0000000000000000');
  assertValid(t, u64BE, MIN, '0000000000000000');
  assertValid(t, u64LE, MAX, 'ffffffffffffffff');
  assertValid(t, u64BE, MAX, 'ffffffffffffffff');

  // Out of range.
  assertRangeError(t, u64LE, MIN - 1n);
  assertRangeError(t, u64BE, MIN - 1n);
  assertRangeError(t, u64LE, MAX + 1n);
  assertRangeError(t, u64BE, MAX + 1n);
});

test('description', (t) => {
  t.is(u64().description, 'u64(le)');
  t.is(u64({ endian: Endian.Little }).description, 'u64(le)');
  t.is(u64({ endian: Endian.Big }).description, 'u64(be)');
  t.is(u64({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(u64().fixedSize, 8);
  t.is(u64().maxSize, 8);
});

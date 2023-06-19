import test from 'ava';
import { Endian, i64 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = -BigInt('0x7fffffffffffffff') - 1n;
const MAX = BigInt('0x7fffffffffffffff');

test('serialization', (t) => {
  const i64LE = i64();
  const i64BE = i64({ endian: Endian.Big });

  assertValid(t, i64LE, 0n, '0000000000000000');
  assertValid(t, i64BE, 0n, '0000000000000000');
  assertValid(t, i64LE, 1n, '0100000000000000');
  assertValid(t, i64BE, 1n, '0000000000000001');
  assertValid(t, i64LE, 42n, '2a00000000000000');
  assertValid(t, i64BE, 42n, '000000000000002a');
  assertValid(t, i64LE, -1n, 'ffffffffffffffff');
  assertValid(t, i64BE, -1n, 'ffffffffffffffff');
  assertValid(t, i64LE, -42n, 'd6ffffffffffffff');
  assertValid(t, i64BE, -42n, 'ffffffffffffffd6');

  // Pre-boundaries.
  assertValid(t, i64LE, MIN + 1n, '0100000000000080');
  assertValid(t, i64BE, MIN + 1n, '8000000000000001');
  assertValid(t, i64LE, MAX - 1n, 'feffffffffffff7f');
  assertValid(t, i64BE, MAX - 1n, '7ffffffffffffffe');

  // Boundaries.
  assertValid(t, i64LE, MIN, '0000000000000080');
  assertValid(t, i64BE, MIN, '8000000000000000');
  assertValid(t, i64LE, MAX, 'ffffffffffffff7f');
  assertValid(t, i64BE, MAX, '7fffffffffffffff');

  // Out of range.
  assertRangeError(t, i64LE, MIN - 1n);
  assertRangeError(t, i64BE, MIN - 1n);
  assertRangeError(t, i64LE, MAX + 1n);
  assertRangeError(t, i64BE, MAX + 1n);
});

test('description', (t) => {
  t.is(i64().description, 'i64(le)');
  t.is(i64({ endian: Endian.Little }).description, 'i64(le)');
  t.is(i64({ endian: Endian.Big }).description, 'i64(be)');
  t.is(i64({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(i64().fixedSize, 8);
  t.is(i64().maxSize, 8);
});

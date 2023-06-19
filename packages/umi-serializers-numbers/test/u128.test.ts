import test from 'ava';
import { Endian, u128 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = 0n;
const MAX = BigInt('0xffffffffffffffffffffffffffffffff');
const HALF = BigInt('0xffffffffffffffff');

test('serialization', (t) => {
  const u128LE = u128();
  const u128BE = u128({ endian: Endian.Big });

  assertValid(t, u128LE, 1n, '01000000000000000000000000000000');
  assertValid(t, u128BE, 1n, '00000000000000000000000000000001');
  assertValid(t, u128LE, 42n, '2a000000000000000000000000000000');
  assertValid(t, u128BE, 42n, '0000000000000000000000000000002a');

  // Half bytes.
  assertValid(t, u128LE, HALF, 'ffffffffffffffff0000000000000000');
  assertValid(t, u128BE, HALF, '0000000000000000ffffffffffffffff');

  // Pre-boundaries.
  assertValid(t, u128LE, MIN + 1n, '01000000000000000000000000000000');
  assertValid(t, u128BE, MIN + 1n, '00000000000000000000000000000001');
  assertValid(t, u128LE, MAX - 1n, 'feffffffffffffffffffffffffffffff');
  assertValid(t, u128BE, MAX - 1n, 'fffffffffffffffffffffffffffffffe');

  // Boundaries.
  assertValid(t, u128LE, MIN, '00000000000000000000000000000000');
  assertValid(t, u128BE, MIN, '00000000000000000000000000000000');
  assertValid(t, u128LE, MAX, 'ffffffffffffffffffffffffffffffff');
  assertValid(t, u128BE, MAX, 'ffffffffffffffffffffffffffffffff');

  // Out of range.
  assertRangeError(t, u128LE, MIN - 1n);
  assertRangeError(t, u128BE, MIN - 1n);
  assertRangeError(t, u128LE, MAX + 1n);
  assertRangeError(t, u128BE, MAX + 1n);
});

test('description', (t) => {
  t.is(u128().description, 'u128(le)');
  t.is(u128({ endian: Endian.Little }).description, 'u128(le)');
  t.is(u128({ endian: Endian.Big }).description, 'u128(be)');
  t.is(u128({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(u128().fixedSize, 16);
  t.is(u128().maxSize, 16);
});

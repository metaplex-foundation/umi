import test from 'ava';
import { Endian, i128 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = -BigInt('0x7fffffffffffffffffffffffffffffff') - 1n;
const MAX = BigInt('0x7fffffffffffffffffffffffffffffff');

test('serialization', (t) => {
  const i128LE = i128();
  const i128BE = i128({ endian: Endian.Big });

  assertValid(t, i128LE, 0n, '00000000000000000000000000000000');
  assertValid(t, i128BE, 0n, '00000000000000000000000000000000');
  assertValid(t, i128LE, 1n, '01000000000000000000000000000000');
  assertValid(t, i128BE, 1n, '00000000000000000000000000000001');
  assertValid(t, i128LE, 42n, '2a000000000000000000000000000000');
  assertValid(t, i128BE, 42n, '0000000000000000000000000000002a');
  assertValid(t, i128LE, -1n, 'ffffffffffffffffffffffffffffffff');
  assertValid(t, i128BE, -1n, 'ffffffffffffffffffffffffffffffff');
  assertValid(t, i128LE, -42n, 'd6ffffffffffffffffffffffffffffff');
  assertValid(t, i128BE, -42n, 'ffffffffffffffffffffffffffffffd6');

  // Pre-boundaries.
  assertValid(t, i128LE, MIN + 1n, '01000000000000000000000000000080');
  assertValid(t, i128BE, MIN + 1n, '80000000000000000000000000000001');
  assertValid(t, i128LE, MAX - 1n, 'feffffffffffffffffffffffffffff7f');
  assertValid(t, i128BE, MAX - 1n, '7ffffffffffffffffffffffffffffffe');

  // Boundaries.
  assertValid(t, i128LE, MIN, '00000000000000000000000000000080');
  assertValid(t, i128BE, MIN, '80000000000000000000000000000000');
  assertValid(t, i128LE, MAX, 'ffffffffffffffffffffffffffffff7f');
  assertValid(t, i128BE, MAX, '7fffffffffffffffffffffffffffffff');

  // Out of range.
  assertRangeError(t, i128LE, MIN - 1n);
  assertRangeError(t, i128BE, MIN - 1n);
  assertRangeError(t, i128LE, MAX + 1n);
  assertRangeError(t, i128BE, MAX + 1n);
});

test('description', (t) => {
  t.is(i128().description, 'i128(le)');
  t.is(i128({ endian: Endian.Little }).description, 'i128(le)');
  t.is(i128({ endian: Endian.Big }).description, 'i128(be)');
  t.is(i128({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(i128().fixedSize, 16);
  t.is(i128().maxSize, 16);
});

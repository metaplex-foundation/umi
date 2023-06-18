import test from 'ava';
import { Endian, u32 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = 0;
const MAX = Number('0xffffffff');
const HALF = Number('0xffff');

test('serialization', (t) => {
  const u32LE = u32();
  const u32BE = u32({ endian: Endian.Big });

  assertValid(t, u32LE, 1, '01000000');
  assertValid(t, u32BE, 1, '00000001');
  assertValid(t, u32LE, 42, '2a000000');
  assertValid(t, u32BE, 42, '0000002a');

  // Half bytes.
  assertValid(t, u32LE, HALF, 'ffff0000');
  assertValid(t, u32BE, HALF, '0000ffff');

  // Pre-boundaries.
  assertValid(t, u32LE, MIN + 1, '01000000');
  assertValid(t, u32BE, MIN + 1, '00000001');
  assertValid(t, u32LE, MAX - 1, 'feffffff');
  assertValid(t, u32BE, MAX - 1, 'fffffffe');

  // Boundaries.
  assertValid(t, u32LE, MIN, '00000000');
  assertValid(t, u32BE, MIN, '00000000');
  assertValid(t, u32LE, MAX, 'ffffffff');
  assertValid(t, u32BE, MAX, 'ffffffff');

  // Out of range.
  assertRangeError(t, u32LE, MIN - 1);
  assertRangeError(t, u32BE, MIN - 1);
  assertRangeError(t, u32LE, MAX + 1);
  assertRangeError(t, u32BE, MAX + 1);
});

test('description', (t) => {
  t.is(u32().description, 'u32(le)');
  t.is(u32({ endian: Endian.Little }).description, 'u32(le)');
  t.is(u32({ endian: Endian.Big }).description, 'u32(be)');
  t.is(u32({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(u32().fixedSize, 4);
  t.is(u32().maxSize, 4);
});

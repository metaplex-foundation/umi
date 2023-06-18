import test from 'ava';
import { Endian, i32 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = -Number('0x7fffffff') - 1;
const MAX = Number('0x7fffffff');

test('serialization', (t) => {
  const i32LE = i32();
  const i32BE = i32({ endian: Endian.Big });

  assertValid(t, i32LE, 0, '00000000');
  assertValid(t, i32BE, 0, '00000000');
  assertValid(t, i32LE, 1, '01000000');
  assertValid(t, i32BE, 1, '00000001');
  assertValid(t, i32LE, 42, '2a000000');
  assertValid(t, i32BE, 42, '0000002a');
  assertValid(t, i32LE, -1, 'ffffffff');
  assertValid(t, i32BE, -1, 'ffffffff');
  assertValid(t, i32LE, -42, 'd6ffffff');
  assertValid(t, i32BE, -42, 'ffffffd6');

  // Pre-boundaries.
  assertValid(t, i32LE, MIN + 1, '01000080');
  assertValid(t, i32BE, MIN + 1, '80000001');
  assertValid(t, i32LE, MAX - 1, 'feffff7f');
  assertValid(t, i32BE, MAX - 1, '7ffffffe');

  // Boundaries.
  assertValid(t, i32LE, MIN, '00000080');
  assertValid(t, i32BE, MIN, '80000000');
  assertValid(t, i32LE, MAX, 'ffffff7f');
  assertValid(t, i32BE, MAX, '7fffffff');

  // Out of range.
  assertRangeError(t, i32LE, MIN - 1);
  assertRangeError(t, i32BE, MIN - 1);
  assertRangeError(t, i32LE, MAX + 1);
  assertRangeError(t, i32BE, MAX + 1);
});

test('description', (t) => {
  t.is(i32().description, 'i32(le)');
  t.is(i32({ endian: Endian.Little }).description, 'i32(le)');
  t.is(i32({ endian: Endian.Big }).description, 'i32(be)');
  t.is(i32({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(i32().fixedSize, 4);
  t.is(i32().maxSize, 4);
});

import test from 'ava';
import { Endian, i16 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = -Number('0x7fff') - 1;
const MAX = Number('0x7fff');

test('serialization', (t) => {
  const i16LE = i16();
  const i16BE = i16({ endian: Endian.Big });

  assertValid(t, i16LE, 0, '0000');
  assertValid(t, i16BE, 0, '0000');
  assertValid(t, i16LE, 1, '0100');
  assertValid(t, i16BE, 1, '0001');
  assertValid(t, i16LE, 42, '2a00');
  assertValid(t, i16BE, 42, '002a');
  assertValid(t, i16LE, -1, 'ffff');
  assertValid(t, i16BE, -1, 'ffff');
  assertValid(t, i16LE, -42, 'd6ff');
  assertValid(t, i16BE, -42, 'ffd6');

  // Pre-boundaries.
  assertValid(t, i16LE, MIN + 1, '0180');
  assertValid(t, i16BE, MIN + 1, '8001');
  assertValid(t, i16LE, MAX - 1, 'fe7f');
  assertValid(t, i16BE, MAX - 1, '7ffe');

  // Boundaries.
  assertValid(t, i16LE, MIN, '0080');
  assertValid(t, i16BE, MIN, '8000');
  assertValid(t, i16LE, MAX, 'ff7f');
  assertValid(t, i16BE, MAX, '7fff');

  // Out of range.
  assertRangeError(t, i16LE, MIN - 1);
  assertRangeError(t, i16BE, MIN - 1);
  assertRangeError(t, i16LE, MAX + 1);
  assertRangeError(t, i16BE, MAX + 1);
});

test('description', (t) => {
  t.is(i16().description, 'i16(le)');
  t.is(i16({ endian: Endian.Little }).description, 'i16(le)');
  t.is(i16({ endian: Endian.Big }).description, 'i16(be)');
  t.is(i16({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(i16().fixedSize, 2);
  t.is(i16().maxSize, 2);
});

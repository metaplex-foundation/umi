import test from 'ava';
import { Endian, u16 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = 0;
const MAX = Number('0xffff');
const HALF = Number('0xff');

test('serialization', (t) => {
  const u16LE = u16();
  const u16BE = u16({ endian: Endian.Big });

  assertValid(t, u16LE, 1, '0100');
  assertValid(t, u16BE, 1, '0001');
  assertValid(t, u16LE, 42, '2a00');
  assertValid(t, u16BE, 42, '002a');

  // Half bytes.
  assertValid(t, u16LE, HALF, 'ff00');
  assertValid(t, u16BE, HALF, '00ff');

  // Pre-boundaries.
  assertValid(t, u16LE, MIN + 1, '0100');
  assertValid(t, u16BE, MIN + 1, '0001');
  assertValid(t, u16LE, MAX - 1, 'feff');
  assertValid(t, u16BE, MAX - 1, 'fffe');

  // Boundaries.
  assertValid(t, u16LE, MIN, '0000');
  assertValid(t, u16BE, MIN, '0000');
  assertValid(t, u16LE, MAX, 'ffff');
  assertValid(t, u16BE, MAX, 'ffff');

  // Out of range.
  assertRangeError(t, u16LE, MIN - 1);
  assertRangeError(t, u16BE, MIN - 1);
  assertRangeError(t, u16LE, MAX + 1);
  assertRangeError(t, u16BE, MAX + 1);
});

test('description', (t) => {
  t.is(u16().description, 'u16(le)');
  t.is(u16({ endian: Endian.Little }).description, 'u16(le)');
  t.is(u16({ endian: Endian.Big }).description, 'u16(be)');
  t.is(u16({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(u16().fixedSize, 2);
  t.is(u16().maxSize, 2);
});

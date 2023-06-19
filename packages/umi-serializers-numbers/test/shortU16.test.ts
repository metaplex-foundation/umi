import test from 'ava';
import { shortU16 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = 0;
const MAX = 65535;

test('serialization', (t) => {
  assertValid(t, shortU16(), 0, '00');
  assertValid(t, shortU16(), 1, '01');
  assertValid(t, shortU16(), 42, '2a');
  assertValid(t, shortU16(), 127, '7f');
  assertValid(t, shortU16(), 128, '8001');
  assertValid(t, shortU16(), 16383, 'ff7f');
  assertValid(t, shortU16(), 16384, '808001');

  // Pre-boundaries.
  assertValid(t, shortU16(), MIN + 1, '01');
  assertValid(t, shortU16(), MAX - 1, 'feff03');

  // Boundaries.
  assertValid(t, shortU16(), MIN, '00');
  assertValid(t, shortU16(), MAX, 'ffff03');

  // Out of range.
  assertRangeError(t, shortU16(), MIN - 1);
  assertRangeError(t, shortU16(), MAX + 1);

  // Assert re-serialization.
  const serializer = shortU16();
  for (let i = 0; i <= 0b1111111111111111; i += 1) {
    const buffer = serializer.serialize(i);
    t.is(serializer.deserialize(buffer)[0], i);
  }
});

test('description', (t) => {
  t.is(shortU16().description, 'shortU16');
  t.is(shortU16({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(shortU16().fixedSize, null);
  t.is(shortU16().maxSize, 3);
});

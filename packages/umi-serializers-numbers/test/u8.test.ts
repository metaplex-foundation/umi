import test from 'ava';
import { u8 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = 0;
const MAX = Number('0xff');

test('serialization', (t) => {
  assertValid(t, u8(), 1, '01');
  assertValid(t, u8(), 42, '2a');

  // Pre-boundaries.
  assertValid(t, u8(), MIN + 1, '01');
  assertValid(t, u8(), MAX - 1, 'fe');

  // Boundaries.
  assertValid(t, u8(), MIN, '00');
  assertValid(t, u8(), MAX, 'ff');

  // Out of range.
  assertRangeError(t, u8(), MIN - 1);
  assertRangeError(t, u8(), MAX + 1);
});

test('description', (t) => {
  t.is(u8().description, 'u8');
  t.is(u8({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(u8().fixedSize, 1);
  t.is(u8().maxSize, 1);
});

import test from 'ava';
import { i8 } from '../src';
import { assertRangeError, assertValid } from './_setup';

const MIN = -Number('0x7f') - 1;
const MAX = Number('0x7f');

test('serialization', (t) => {
  assertValid(t, i8(), 0, '00');
  assertValid(t, i8(), 1, '01');
  assertValid(t, i8(), 42, '2a');
  assertValid(t, i8(), -1, 'ff');
  assertValid(t, i8(), -42, 'd6');

  // Pre-boundaries.
  assertValid(t, i8(), MIN + 1, '81');
  assertValid(t, i8(), MAX - 1, '7e');

  // Boundaries.
  assertValid(t, i8(), MIN, '80');
  assertValid(t, i8(), MAX, '7f');

  // Out of range.
  assertRangeError(t, i8(), MIN - 1);
  assertRangeError(t, i8(), MAX + 1);
});

test('description', (t) => {
  t.is(i8().description, 'i8');
  t.is(i8({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(i8().fixedSize, 1);
  t.is(i8().maxSize, 1);
});

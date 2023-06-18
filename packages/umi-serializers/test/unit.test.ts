/* eslint-disable no-void */
import test from 'ava';
import { unit } from '../src';
import { d, s } from './_helpers';

test('serialization', (t) => {
  s(t, unit(), undefined, '');
  s(t, unit(), void 0, '');
});

test('deserialization', (t) => {
  d(t, unit(), '', undefined, 0);
  d(t, unit(), '00', undefined, 0);
  d(t, unit(), ['00', 1], undefined, 1);
});

test('description', (t) => {
  t.is(unit().description, 'unit');
  t.is(unit({ description: 'My Unit' }).description, 'My Unit');
});

test('sizes', (t) => {
  t.is(unit().fixedSize, 0);
  t.is(unit().maxSize, 0);
});

/* eslint-disable no-void */
import test from 'ava';
import { DataViewSerializer } from '../src';
import { s, d } from './_helpers';

test('serialization', (t) => {
  const { unit } = new DataViewSerializer();
  s(t, unit(), undefined, '');
  s(t, unit(), void 0, '');
});

test('deserialization', (t) => {
  const { unit } = new DataViewSerializer();
  d(t, unit(), '', undefined, 0);
  d(t, unit(), '00', undefined, 0);
  d(t, unit(), ['00', 1], undefined, 1);
});

test('description', (t) => {
  const { unit } = new DataViewSerializer();
  t.is(unit().description, 'unit');
  t.is(unit({ description: 'My Unit' }).description, 'My Unit');
});

test('sizes', (t) => {
  const { unit } = new DataViewSerializer();
  t.is(unit().fixedSize, 0);
  t.is(unit().maxSize, 0);
});

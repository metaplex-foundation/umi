import test from 'ava';
import { BeetSerializer } from '../src';
import { s, d } from './_helpers';

test('serialization', (t) => {
  const { bytes } = new BeetSerializer();
  s(t, bytes(), new Uint8Array([]), '');
  s(t, bytes(), new Uint8Array([0]), '00');
  s(t, bytes(), new Uint8Array([42, 255]), '2aff');
});

test('deserialization', (t) => {
  const { bytes } = new BeetSerializer();
  d(t, bytes(), '', new Uint8Array([]), 0);
  d(t, bytes(), '00', new Uint8Array([0]), 1);
  d(t, bytes(), '2aff', new Uint8Array([42, 255]), 2);
});

test('description', (t) => {
  const { bytes } = new BeetSerializer();
  t.is(bytes().description, 'bytes');
  t.is(bytes({ description: 'My bytes' }).description, 'My bytes');
});

test('sizes', (t) => {
  const { bytes } = new BeetSerializer();
  t.is(bytes().fixedSize, null);
  t.is(bytes().maxSize, null);
});

import test from 'ava';
import { createBeetSerializer } from '../src';
import { s, d } from './_helpers';

test('serialization', (t) => {
  const { tuple, string, u8, i16 } = createBeetSerializer();
  s(t, tuple([]), [], '');
  s(t, tuple([u8()]), [42], '2a');
  s(t, tuple([u8(), i16()]), [0, -42], '00d6ff');
  s(t, tuple([string(), u8()]), ['Hello', 42], '0500000048656c6c6f2a');
});

test('deserialization', (t) => {
  const { tuple, string, u8, i16 } = createBeetSerializer();
  d(t, tuple([]), '', [], 0);
  d(t, tuple([u8()]), '2a', [42], 1);
  d(t, tuple([u8(), i16()]), '00d6ff', [0, -42], 3);
  d(t, tuple([string(), u8()]), '0500000048656c6c6f2a', ['Hello', 42], 10);
});

test('(de)serialization with different From and To types', (t) => {
  const { tuple, u8, u64 } = createBeetSerializer();
  const x = tuple<[number, number | bigint], [number, bigint]>([u8(), u64()]);
  s(t, x, [1, 2], '010200000000000000');
  s(t, x, [1, 2n], '010200000000000000');
  s(t, x, [1, 2n ** 63n], '010000000000000080');
  d(t, x, '010200000000000000', [1, 2n], 9);
  d(t, x, '010000000000000080', [1, 2n ** 63n], 9);
});

test('description', (t) => {
  const { tuple, u8, i16, string } = createBeetSerializer();
  t.is(tuple([u8()]).description, 'tuple(u8)');
  t.is(
    tuple([u8(), string(), i16()]).description,
    'tuple(u8, string(utf8; u32(le)), i16(le))'
  );
  t.is(tuple([u8()], { description: 'my tuple' }).description, 'my tuple');
});

test('sizes', (t) => {
  const { tuple, u8, i16, string } = createBeetSerializer();
  t.is(tuple([]).fixedSize, 0);
  t.is(tuple([]).maxSize, 0);
  t.is(tuple([u8()]).fixedSize, 1);
  t.is(tuple([u8()]).maxSize, 1);
  t.is(tuple([u8(), i16()]).fixedSize, 1 + 2);
  t.is(tuple([u8(), i16()]).maxSize, 1 + 2);
  t.is(tuple([u8(), string(), i16()]).fixedSize, null);
  t.is(tuple([u8(), string(), i16()]).maxSize, null);
});

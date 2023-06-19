import test from 'ava';
import { Endian, f32 } from '../src';
import { assertValid } from './_setup';

const APPROX_PI = 3.1415927410125732;

test('serialization', (t) => {
  const f32LE = f32();
  const f32BE = f32({ endian: Endian.Big });

  assertValid(t, f32LE, 0, '00000000');
  assertValid(t, f32BE, 0, '00000000');

  assertValid(t, f32LE, 1, '0000803f');
  assertValid(t, f32BE, 1, '3f800000');
  assertValid(t, f32LE, 42, '00002842');
  assertValid(t, f32BE, 42, '42280000');
  assertValid(t, f32LE, Math.PI, 'db0f4940', APPROX_PI);
  assertValid(t, f32BE, Math.PI, '40490fdb', APPROX_PI);

  assertValid(t, f32LE, -1, '000080bf');
  assertValid(t, f32BE, -1, 'bf800000');
  assertValid(t, f32LE, -42, '000028c2');
  assertValid(t, f32BE, -42, 'c2280000');
  assertValid(t, f32LE, -Math.PI, 'db0f49c0', -APPROX_PI);
  assertValid(t, f32BE, -Math.PI, 'c0490fdb', -APPROX_PI);
});

test('description', (t) => {
  t.is(f32().description, 'f32(le)');
  t.is(f32({ endian: Endian.Little }).description, 'f32(le)');
  t.is(f32({ endian: Endian.Big }).description, 'f32(be)');
  t.is(f32({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(f32().fixedSize, 4);
  t.is(f32().maxSize, 4);
});

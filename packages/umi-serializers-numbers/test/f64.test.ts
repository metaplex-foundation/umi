import test from 'ava';
import { Endian, f64 } from '../src';
import { assertValid } from './_setup';

const APPROX_PI = 3.141592653589793;

test('serialization', (t) => {
  const f64LE = f64();
  const f64BE = f64({ endian: Endian.Big });

  assertValid(t, f64LE, 0, '0000000000000000');
  assertValid(t, f64BE, 0, '0000000000000000');

  assertValid(t, f64LE, 1, '000000000000f03f');
  assertValid(t, f64BE, 1, '3ff0000000000000');
  assertValid(t, f64LE, 42, '0000000000004540');
  assertValid(t, f64BE, 42, '4045000000000000');
  assertValid(t, f64LE, Math.PI, '182d4454fb210940', APPROX_PI);
  assertValid(t, f64BE, Math.PI, '400921fb54442d18', APPROX_PI);

  assertValid(t, f64LE, -1, '000000000000f0bf');
  assertValid(t, f64BE, -1, 'bff0000000000000');
  assertValid(t, f64LE, -42, '00000000000045c0');
  assertValid(t, f64BE, -42, 'c045000000000000');
  assertValid(t, f64LE, -Math.PI, '182d4454fb2109c0', -APPROX_PI);
  assertValid(t, f64BE, -Math.PI, 'c00921fb54442d18', -APPROX_PI);
});

test('description', (t) => {
  t.is(f64().description, 'f64(le)');
  t.is(f64({ endian: Endian.Little }).description, 'f64(le)');
  t.is(f64({ endian: Endian.Big }).description, 'f64(be)');
  t.is(f64({ description: 'custom' }).description, 'custom');
});

test('sizes', (t) => {
  t.is(f64().fixedSize, 8);
  t.is(f64().maxSize, 8);
});

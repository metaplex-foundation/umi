import { base16, Endian } from '@metaplex-foundation/umi';
import test from 'ava';
import { createBeetSerializer } from '../src';
import { d, s } from './_helpers';

test('prefixed (de)serialization', (t) => {
  const { bytes, u8 } = createBeetSerializer();
  const bytesU8 = bytes({ size: u8() });

  s(t, bytesU8, new Uint8Array([42, 3]), '022a03');
  d(t, bytesU8, '022a03ffff', new Uint8Array([42, 3]), 3);
  d(t, bytesU8, ['ff022a03ffff', 1], new Uint8Array([42, 3]), 4);

  // Not enough bytes.
  t.throws(() => bytesU8.deserialize(base16.serialize('022a')), {
    message: (m) => m.includes('Serializer [bytes] expected 2 bytes, got 1.'),
  });
});

test('fixed (de)serialization', (t) => {
  const { bytes } = createBeetSerializer();
  const bytes2 = bytes({ size: 2 });
  const bytes5 = bytes({ size: 5 });

  // Exact size.
  s(t, bytes2, new Uint8Array([1, 2]), '0102');
  d(t, bytes2, '0102', new Uint8Array([1, 2]), 2);
  d(t, bytes2, ['ff0102', 1], new Uint8Array([1, 2]), 3);

  // Too small (padded).
  s(t, bytes5, new Uint8Array([1, 2]), '0102000000');
  d(t, bytes5, '0102000000', new Uint8Array([1, 2, 0, 0, 0]), 5);
  d(t, bytes5, ['ff0102000000', 1], new Uint8Array([1, 2, 0, 0, 0]), 6);
  t.throws(() => bytes5.deserialize(base16.serialize('0102')), {
    message: (m) => m.includes('Fixed serializer expected 5 bytes, got 2'),
  });

  // Too large (truncated).
  s(t, bytes2, new Uint8Array([1, 2, 3, 4, 5]), '0102');
  d(t, bytes2, '0102030405', new Uint8Array([1, 2]), 2);
  d(t, bytes2, ['ff0102030405', 1], new Uint8Array([1, 2]), 3);
});

test('variable (de)serialization', (t) => {
  const { bytes } = createBeetSerializer();

  s(t, bytes(), new Uint8Array([]), '');
  d(t, bytes(), '', new Uint8Array([]), 0);

  s(t, bytes(), new Uint8Array([0]), '00');
  d(t, bytes(), '00', new Uint8Array([0]), 1);

  s(t, bytes(), new Uint8Array([42, 255]), '2aff');
  d(t, bytes(), '2aff', new Uint8Array([42, 255]), 2);
  d(t, bytes(), ['002aff', 1], new Uint8Array([42, 255]), 3);
});

test('description', (t) => {
  const { bytes, u16 } = createBeetSerializer();

  // Size.
  t.is(bytes().description, 'bytes(variable)');
  t.is(bytes({ size: 42 }).description, 'bytes(42)');
  t.is(bytes({ size: 'variable' }).description, 'bytes(variable)');
  t.is(bytes({ size: u16() }).description, 'bytes(u16(le))');
  t.is(
    bytes({ size: u16({ endian: Endian.Big }) }).description,
    'bytes(u16(be))'
  );

  // Custom.
  t.is(bytes({ description: 'My bytes' }).description, 'My bytes');
});

test('sizes', (t) => {
  const { bytes, u8 } = createBeetSerializer();
  t.is(bytes().fixedSize, null);
  t.is(bytes().maxSize, null);
  t.is(bytes({ size: u8() }).fixedSize, null);
  t.is(bytes({ size: u8() }).maxSize, null);
  t.is(bytes({ size: 'variable' }).fixedSize, null);
  t.is(bytes({ size: 'variable' }).maxSize, null);
  t.is(bytes({ size: 42 }).fixedSize, 42);
  t.is(bytes({ size: 42 }).maxSize, 42);
});

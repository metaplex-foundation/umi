import test from 'ava';
import { Endian } from '@metaplex-foundation/umi';
import { createDataViewSerializer } from '../src';
import { s, d } from './_helpers';

test('serialization', (t) => {
  const { bool, u32 } = createDataViewSerializer();
  s(t, bool(), true, '01');
  s(t, bool(), false, '00');
  s(t, bool({ size: u32() }), true, '01000000');
  s(t, bool({ size: u32() }), false, '00000000');
});

test('deserialization', (t) => {
  const { bool, u32 } = createDataViewSerializer();
  d(t, bool(), '01', true, 1);
  d(t, bool(), '00', false, 1);
  d(t, bool(), ['000001', 2], true, 3);
  d(t, bool(), ['000000', 2], false, 3);
  d(t, bool({ size: u32() }), '01000000', true, 4);
  d(t, bool({ size: u32() }), '00000000', false, 4);
});

test('description', (t) => {
  const { bool, u32 } = createDataViewSerializer();
  t.is(bool().description, 'bool(u8)');
  t.is(bool({ size: u32() }).description, 'bool(u32(le))');
  t.is(
    bool({ size: u32({ endian: Endian.Big }) }).description,
    'bool(u32(be))'
  );
  t.is(bool({ description: 'My bool' }).description, 'My bool');
});

test('sizes', (t) => {
  const { bool, u32 } = createDataViewSerializer();
  t.is(bool().fixedSize, 1);
  t.is(bool().maxSize, 1);
  t.is(bool({ size: u32() }).fixedSize, 4);
  t.is(bool({ size: u32() }).maxSize, 4);
});

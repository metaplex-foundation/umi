import test from 'ava';
import { none, some } from '@metaplex-foundation/umi-core';
import { BeetSerializer } from '../src';
import { s, d } from './_helpers';

test('regular (de)serialization', (t) => {
  const { option, u8, u16, u64, string } = new BeetSerializer();

  // None.
  s(t, option(u8()), none(), '00');
  d(t, option(u8()), '00', none(), 1);
  d(t, option(u8()), ['ffff00', 2], none(), 3);

  // None with custom prefix.
  s(t, option(u8(), { prefix: u16() }), none(), '0000');
  d(t, option(u8(), { prefix: u16() }), '0000', none(), 2);

  // Some.
  s(t, option(u8()), some(42), '012a');
  d(t, option(u8()), '012a', some(42), 2);
  d(t, option(u8()), ['ffff012a', 2], some(42), 4);

  // Some with custom prefix.
  s(t, option(u8(), { prefix: u16() }), some(42), '01002a');
  d(t, option(u8(), { prefix: u16() }), '01002a', some(42), 3);

  // Some with strings.
  s(t, option(string()), some('Hello'), '010500000048656c6c6f');
  d(t, option(string()), '010500000048656c6c6f', some('Hello'), 10);

  // Different From and To types.
  const optionU64 = option<number | bigint, bigint>(u64());
  s(t, optionU64, some(2), '010200000000000000');
  d(t, optionU64, '010200000000000000', some(2n));
});

// test('fixed (de)serialization', (t) => {
//   const { option } = new BeetSerializer();
//   d(t, option(), '', new Uint8Array([]), 0);
//   d(t, option(), '00', new Uint8Array([0]), 1);
//   d(t, option(), '2aff', new Uint8Array([42, 255]), 2);
// });

// test('description', (t) => {
//   const { option } = new BeetSerializer();
//   t.is(option().description, 'option');
//   t.is(option({ description: 'My option' }).description, 'My option');
// });

// test('sizes', (t) => {
//   const { option } = new BeetSerializer();
//   t.is(option().fixedSize, null);
//   t.is(option().maxSize, null);
// });

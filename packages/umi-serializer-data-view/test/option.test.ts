import test from 'ava';
import { none, some } from '@metaplex-foundation/umi';
import { createDataViewSerializer } from '../src';
import { s, d } from './_helpers';

test('regular (de)serialization', (t) => {
  const { option, u8, u16, u64, string } = createDataViewSerializer();

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

test('fixed (de)serialization', (t) => {
  const { option, u8, u16, u64, string } = createDataViewSerializer();
  const fixedU8 = option(u8(), { fixed: true });
  const fixedU8WithU16Prefix = option(u8(), { fixed: true, prefix: u16() });
  const fixedString = option(string({ size: 5 }), { fixed: true });

  // None.
  s(t, fixedU8, none(), '0000');
  d(t, fixedU8, '0000', none(), 2);
  d(t, fixedU8, ['ffff0000', 2], none(), 4);

  // None with custom prefix.
  s(t, fixedU8WithU16Prefix, none(), '000000');
  d(t, fixedU8WithU16Prefix, '000000', none(), 3);

  // Some.
  s(t, fixedU8, some(42), '012a');
  d(t, fixedU8, '012a', some(42), 2);
  d(t, fixedU8, ['ffff012a', 2], some(42), 4);

  // Some with custom prefix.
  s(t, fixedU8WithU16Prefix, some(42), '01002a');
  d(t, fixedU8WithU16Prefix, '01002a', some(42), 3);

  // Some with fixed strings.
  s(t, fixedString, some('Hello'), '0148656c6c6f');
  d(t, fixedString, '0148656c6c6f', some('Hello'), 6);

  // Different From and To types.
  const optionU64 = option<number | bigint, bigint>(u64());
  s(t, optionU64, some(2), '010200000000000000');
  d(t, optionU64, '010200000000000000', some(2n));

  // Fixed options must wrap fixed-size items.
  t.throws(() => option(string(), { fixed: true }), {
    message: (m) =>
      m.includes('Fixed options can only be used with fixed-size serializers'),
  });
});

test('description', (t) => {
  const { option, u8, u16, string } = createDataViewSerializer();
  t.is(option(u8()).description, 'option(u8; u8)');
  t.is(option(string()).description, 'option(string(utf8; u32(le)); u8)');
  t.is(option(u8(), { prefix: u16() }).description, 'option(u8; u16(le))');

  // Fixed.
  t.is(option(u8(), { fixed: true }).description, 'option(u8; u8; fixed)');
  t.is(
    option(string({ size: 5 }), { fixed: true }).description,
    'option(string(utf8; 5); u8; fixed)'
  );
  t.is(
    option(u8(), { prefix: u16(), fixed: true }).description,
    'option(u8; u16(le); fixed)'
  );

  // Custom description.
  t.is(option(u8(), { description: 'My option' }).description, 'My option');
});

test('sizes', (t) => {
  const { option, u8, u16, string } = createDataViewSerializer();
  t.is(option(u8()).fixedSize, null);
  t.is(option(u8()).maxSize, 2);
  t.is(option(string()).fixedSize, null);
  t.is(option(string()).maxSize, null);
  t.is(option(u8(), { prefix: u16() }).fixedSize, null);
  t.is(option(u8(), { prefix: u16() }).maxSize, 3);

  // Fixed.
  t.is(option(u8(), { fixed: true }).fixedSize, 2);
  t.is(option(u8(), { fixed: true }).maxSize, 2);
  t.is(option(string({ size: 5 }), { fixed: true }).fixedSize, 6);
  t.is(option(string({ size: 5 }), { fixed: true }).maxSize, 6);
  t.is(option(u8(), { prefix: u16(), fixed: true }).fixedSize, 3);
  t.is(option(u8(), { prefix: u16(), fixed: true }).maxSize, 3);
});

import test from 'ava';
import { none, some } from '@metaplex-foundation/umi';
import { option } from '../src/option';
import { s, d } from './_helpers';
import { u16, u64, u8 } from '../src/numbers';
import { string } from '../src/string';

test('regular (de)serialization', (t) => {
  // None.
  s(t, option(u8()), none(), '00');
  s(t, option(u8()), null, '00');
  d(t, option(u8()), '00', none(), 1);
  d(t, option(u8()), ['ffff00', 2], none(), 3);

  // None with custom prefix.
  s(t, option(u8(), { prefix: u16() }), none(), '0000');
  s(t, option(u8(), { prefix: u16() }), null, '0000');
  d(t, option(u8(), { prefix: u16() }), '0000', none(), 2);

  // Some.
  s(t, option(u8()), some(42), '012a');
  s(t, option(u8()), 42, '012a');
  d(t, option(u8()), '012a', some(42), 2);
  d(t, option(u8()), ['ffff012a', 2], some(42), 4);

  // Some with custom prefix.
  s(t, option(u8(), { prefix: u16() }), some(42), '01002a');
  s(t, option(u8(), { prefix: u16() }), 42, '01002a');
  d(t, option(u8(), { prefix: u16() }), '01002a', some(42), 3);

  // Some with strings.
  s(t, option(string()), some('Hello'), '010500000048656c6c6f');
  s(t, option(string()), 'Hello', '010500000048656c6c6f');
  d(t, option(string()), '010500000048656c6c6f', some('Hello'), 10);

  // Different From and To types.
  const optionU64 = option<number | bigint, bigint>(u64());
  s(t, optionU64, some(2), '010200000000000000');
  s(t, optionU64, some(2n), '010200000000000000');
  s(t, optionU64, 2, '010200000000000000');
  s(t, optionU64, 2n, '010200000000000000');
  d(t, optionU64, '010200000000000000', some(2n));

  // Nested options.
  const nested = option(option(u8()));
  s(t, nested, some(some(42)), '01012a');
  s(t, nested, some(42), '01012a');
  s(t, nested, 42, '01012a');
  d(t, nested, '01012a', some(some(42)), 3);
  s(t, nested, some(none()), '0100');
  s(t, nested, some(null), '0100');
  d(t, nested, '0100', some(none()), 2);
  s(t, nested, none(), '00');
  s(t, nested, null, '00');
  d(t, nested, '00', none(), 1);
});

test('fixed (de)serialization', (t) => {
  const fixedU8 = option(u8(), { fixed: true });
  const fixedU8WithU16Prefix = option(u8(), { fixed: true, prefix: u16() });
  const fixedString = option(string({ size: 5 }), { fixed: true });

  // None.
  s(t, fixedU8, none(), '0000');
  s(t, fixedU8, null, '0000');
  d(t, fixedU8, '0000', none(), 2);
  d(t, fixedU8, ['ffff0000', 2], none(), 4);

  // None with custom prefix.
  s(t, fixedU8WithU16Prefix, none(), '000000');
  s(t, fixedU8WithU16Prefix, null, '000000');
  d(t, fixedU8WithU16Prefix, '000000', none(), 3);

  // Some.
  s(t, fixedU8, some(42), '012a');
  s(t, fixedU8, 42, '012a');
  d(t, fixedU8, '012a', some(42), 2);
  d(t, fixedU8, ['ffff012a', 2], some(42), 4);

  // Some with custom prefix.
  s(t, fixedU8WithU16Prefix, some(42), '01002a');
  s(t, fixedU8WithU16Prefix, 42, '01002a');
  d(t, fixedU8WithU16Prefix, '01002a', some(42), 3);

  // Some with fixed strings.
  s(t, fixedString, some('Hello'), '0148656c6c6f');
  s(t, fixedString, 'Hello', '0148656c6c6f');
  d(t, fixedString, '0148656c6c6f', some('Hello'), 6);

  // Different From and To types.
  const optionU64 = option<number | bigint, bigint>(u64());
  s(t, optionU64, some(2), '010200000000000000');
  s(t, optionU64, some(2n), '010200000000000000');
  s(t, optionU64, 2, '010200000000000000');
  s(t, optionU64, 2n, '010200000000000000');
  d(t, optionU64, '010200000000000000', some(2n));

  // Fixed options must wrap fixed-size items.
  t.throws(() => option(string(), { fixed: true }), {
    message: (m) =>
      m.includes('Fixed options can only be used with fixed-size serializers'),
  });

  // Nested fixed options.
  const nested = option(option(u8(), { fixed: true }), { fixed: true });
  s(t, nested, some(some(42)), '01012a');
  s(t, nested, some(42), '01012a');
  s(t, nested, 42, '01012a');
  d(t, nested, '01012a', some(some(42)), 3);
  s(t, nested, some(none()), '010000');
  s(t, nested, some(null), '010000');
  d(t, nested, '010000', some(none()), 3);
  s(t, nested, none(), '000000');
  s(t, nested, null, '000000');
  d(t, nested, '000000', none(), 3);
});

test('description', (t) => {
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

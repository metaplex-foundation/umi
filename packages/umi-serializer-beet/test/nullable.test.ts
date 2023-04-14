import test from 'ava';
import { createBeetSerializer } from '../src';
import { d, s } from './_helpers';

test('regular (de)serialization', (t) => {
  const { nullable, u8, u16, u64, string } = createBeetSerializer();

  // Null.
  s(t, nullable(u8()), null, '00');
  d(t, nullable(u8()), '00', null, 1);
  d(t, nullable(u8()), ['ffff00', 2], null, 3);

  // Null with custom prefix.
  s(t, nullable(u8(), { prefix: u16() }), null, '0000');
  d(t, nullable(u8(), { prefix: u16() }), '0000', null, 2);

  // Some.
  s(t, nullable(u8()), 42, '012a');
  d(t, nullable(u8()), '012a', 42, 2);
  d(t, nullable(u8()), ['ffff012a', 2], 42, 4);

  // Some with custom prefix.
  s(t, nullable(u8(), { prefix: u16() }), 42, '01002a');
  d(t, nullable(u8(), { prefix: u16() }), '01002a', 42, 3);

  // Some with strings.
  s(t, nullable(string()), 'Hello', '010500000048656c6c6f');
  d(t, nullable(string()), '010500000048656c6c6f', 'Hello', 10);

  // Different From and To types.
  const nullableU64 = nullable<number | bigint, bigint>(u64());
  s(t, nullableU64, 2, '010200000000000000');
  d(t, nullableU64, '010200000000000000', 2n);
});

test('fixed (de)serialization', (t) => {
  const { nullable, u8, u16, u64, string } = createBeetSerializer();
  const fixedU8 = nullable(u8(), { fixed: true });
  const fixedU8WithU16Prefix = nullable(u8(), { fixed: true, prefix: u16() });
  const fixedString = nullable(string({ size: 5 }), { fixed: true });

  // Null.
  s(t, fixedU8, null, '0000');
  d(t, fixedU8, '0000', null, 2);
  d(t, fixedU8, ['ffff0000', 2], null, 4);

  // Null with custom prefix.
  s(t, fixedU8WithU16Prefix, null, '000000');
  d(t, fixedU8WithU16Prefix, '000000', null, 3);

  // Some.
  s(t, fixedU8, 42, '012a');
  d(t, fixedU8, '012a', 42, 2);
  d(t, fixedU8, ['ffff012a', 2], 42, 4);

  // Some with custom prefix.
  s(t, fixedU8WithU16Prefix, 42, '01002a');
  d(t, fixedU8WithU16Prefix, '01002a', 42, 3);

  // Some with fixed strings.
  s(t, fixedString, 'Hello', '0148656c6c6f');
  d(t, fixedString, '0148656c6c6f', 'Hello', 6);

  // Different From and To types.
  const nullableU64 = nullable<number | bigint, bigint>(u64());
  s(t, nullableU64, 2, '010200000000000000');
  d(t, nullableU64, '010200000000000000', 2n);

  // Fixed nullables must wrap fixed-size items.
  t.throws(() => nullable(string(), { fixed: true }), {
    message: (m) =>
      m.includes(
        'Fixed nullables can only be used with fixed-size serializers'
      ),
  });
});

test('description', (t) => {
  const { nullable, u8, u16, string } = createBeetSerializer();
  t.is(nullable(u8()).description, 'nullable(u8; u8)');
  t.is(nullable(string()).description, 'nullable(string(utf8; u32(le)); u8)');
  t.is(nullable(u8(), { prefix: u16() }).description, 'nullable(u8; u16(le))');

  // Fixed.
  t.is(nullable(u8(), { fixed: true }).description, 'nullable(u8; u8; fixed)');
  t.is(
    nullable(string({ size: 5 }), { fixed: true }).description,
    'nullable(string(utf8; 5); u8; fixed)'
  );
  t.is(
    nullable(u8(), { prefix: u16(), fixed: true }).description,
    'nullable(u8; u16(le); fixed)'
  );

  // Custom description.
  t.is(
    nullable(u8(), { description: 'My nullable' }).description,
    'My nullable'
  );
});

test('sizes', (t) => {
  const { nullable, u8, u16, string } = createBeetSerializer();
  t.is(nullable(u8()).fixedSize, null);
  t.is(nullable(u8()).maxSize, 2);
  t.is(nullable(string()).fixedSize, null);
  t.is(nullable(string()).maxSize, null);
  t.is(nullable(u8(), { prefix: u16() }).fixedSize, null);
  t.is(nullable(u8(), { prefix: u16() }).maxSize, 3);

  // Fixed.
  t.is(nullable(u8(), { fixed: true }).fixedSize, 2);
  t.is(nullable(u8(), { fixed: true }).maxSize, 2);
  t.is(nullable(string({ size: 5 }), { fixed: true }).fixedSize, 6);
  t.is(nullable(string({ size: 5 }), { fixed: true }).maxSize, 6);
  t.is(nullable(u8(), { prefix: u16(), fixed: true }).fixedSize, 3);
  t.is(nullable(u8(), { prefix: u16(), fixed: true }).maxSize, 3);
});

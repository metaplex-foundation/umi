import test from 'ava';
import { Endian, array, string, u16, u32, u64, u8 } from '../src';
import { d, s } from './_helpers';

test('prefixed (de)serialization', (t) => {
  // Empty.
  s(t, array(u8()), [], '00000000'); // 4-bytes prefix.
  d(t, array(u8()), '00000000', [], 4);

  // Empty with custom prefix.
  s(t, array(u8(), { size: u8() }), [], '00'); // 1-byte prefix.
  d(t, array(u8(), { size: u8() }), '00', [], 1);

  // Numbers.
  s(t, array(u8()), [42, 1, 2], '030000002a0102');
  d(t, array(u8()), '030000002a0102', [42, 1, 2], 4 + 3);
  d(t, array(u8()), ['ffff030000002a0102', 2], [42, 1, 2], 2 + 4 + 3);

  // Strings.
  s(t, array(string()), ['a', 'b'], '0200000001000000610100000062');
  d(t, array(string()), '0200000001000000610100000062', ['a', 'b'], 4 + 10);

  // Different From and To types.
  const arrayU64 = array<number | bigint, bigint>(u64());
  s(t, arrayU64, [2], '010000000200000000000000');
  d(t, arrayU64, '010000000200000000000000', [2n], 4 + 8);
});

test('fixed (de)serialization', (t) => {
  // Empty.
  s(t, array(u8(), { size: 0 }), [], '');
  d(t, array(u8(), { size: 0 }), '', [], 0);

  // Numbers.
  s(t, array(u8(), { size: 3 }), [42, 1, 2], '2a0102');
  d(t, array(u8(), { size: 3 }), '2a0102', [42, 1, 2], 3);
  d(t, array(u8(), { size: 3 }), ['ffff2a0102', 2], [42, 1, 2], 5);

  // Strings.
  s(t, array(string(), { size: 2 }), ['a', 'b'], '01000000610100000062');
  d(t, array(string(), { size: 2 }), '01000000610100000062', ['a', 'b'], 10);

  // Different From and To types.
  const arrayU64 = array<number | bigint, bigint>(u64(), { size: 1 });
  s(t, arrayU64, [2], '0200000000000000');
  d(t, arrayU64, '0200000000000000', [2n], 8);

  // It fails if the array has a different size.
  t.throws(() => array(u8(), { size: 1 }).serialize([]), {
    message: 'Expected [array] to have 1 items, got 0.',
  });
  t.throws(() => array(string(), { size: 2 }).serialize(['a', 'b', 'c']), {
    message: 'Expected [array] to have 2 items, got 3.',
  });
});

test('remainder (de)serialization', (t) => {
  const remainder = { size: 'remainder' } as const;

  // Empty.
  s(t, array(u8(), remainder), [], '');
  d(t, array(u8(), remainder), '', [], 0);

  // Numbers.
  s(t, array(u8(), remainder), [42, 1, 2], '2a0102');
  d(t, array(u8(), remainder), '2a0102', [42, 1, 2], 3);
  d(t, array(u8(), remainder), ['ffff2a0102', 2], [42, 1, 2], 5);

  // Strings.
  s(t, array(string({ size: 1 }), remainder), ['a', 'b'], '6162');
  d(t, array(string({ size: 1 }), remainder), '6162', ['a', 'b'], 2);

  // Variable sized items.
  s(t, array(string({ size: u8() }), remainder), ['a', 'bc'], '0161026263');
  d(t, array(string({ size: u8() }), remainder), '0161026263', ['a', 'bc'], 5);

  // Different From and To types.
  const arrayU64 = array<number | bigint, bigint>(u64(), remainder);
  s(t, arrayU64, [2], '0200000000000000');
  d(t, arrayU64, '0200000000000000', [2n], 8);
});

test('description', (t) => {
  // Size.
  t.is(array(u8(), { size: 42 }).description, 'array(u8; 42)');
  t.is(array(u8(), { size: 'remainder' }).description, 'array(u8; remainder)');
  t.is(array(u8()).description, 'array(u8; u32(le))');
  t.is(array(u8(), { size: u16() }).description, 'array(u8; u16(le))');
  t.is(
    array(u8(), { size: u16({ endian: Endian.Big }) }).description,
    'array(u8; u16(be))'
  );

  // Custom.
  t.is(
    array(u8(), { description: 'My custom description' }).description,
    'My custom description'
  );
});

test('sizes', (t) => {
  t.is(array(u8()).fixedSize, null);
  t.is(array(u8()).maxSize, null);
  t.is(array(u8(), { size: u8() }).fixedSize, null);
  t.is(array(u8(), { size: u8() }).maxSize, null);
  t.is(array(u8(), { size: 'remainder' }).fixedSize, null);
  t.is(array(u8(), { size: 'remainder' }).maxSize, null);
  t.is(array(u8(), { size: 42 }).fixedSize, 42);
  t.is(array(u8(), { size: 42 }).maxSize, 42);
  t.is(array(u32(), { size: 42 }).fixedSize, 4 * 42);
  t.is(array(u32(), { size: 42 }).maxSize, 4 * 42);
  t.is(array(string(), { size: 42 }).fixedSize, null);
  t.is(array(string(), { size: 42 }).fixedSize, null);
  t.is(array(string(), { size: 0 }).maxSize, 0);
  t.is(array(string(), { size: 0 }).maxSize, 0);
});

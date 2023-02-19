import test from 'ava';
import { Endian } from '@metaplex-foundation/umi-core';
import { BeetSerializer } from '../src';
import { s, d } from './_helpers';

test('prefixed (de)serialization', (t) => {
  const { array, u8, string, u64 } = new BeetSerializer();

  // Empty.
  s(t, array(u8()), [], '00000000'); // 4-bytes prefix.
  d(t, array(u8()), '00000000', [], 4);

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

  // TODO: throw tests.
});

test('fixed (de)serialization', (t) => {
  const { array, u8, string, u64 } = new BeetSerializer();

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
    message: (m: string) =>
      m.includes('Expected array to have 1 items but got 0.'),
  });
  t.throws(() => array(string(), { size: 2 }).serialize(['a', 'b', 'c']), {
    message: (m: string) =>
      m.includes('Expected array to have 2 items but got 3.'),
  });
});

test('remainder (de)serialization', (t) => {
  const { array, u8, string, u64 } = new BeetSerializer();
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

  // Different From and To types.
  const arrayU64 = array<number | bigint, bigint>(u64(), remainder);
  s(t, arrayU64, [2], '0200000000000000');
  d(t, arrayU64, '0200000000000000', [2n], 8);

  // It fails with variable size items.
  t.throws(() => array(string(), remainder), {
    message: (m) =>
      m.includes('Serializers of "remainder" size must have fixed-size items'),
  });
});

test('description', (t) => {
  const { array, u8 } = new BeetSerializer();

  // Size.
  t.is(array(u8(), { size: 42 }).description, 'array(u8(be); 42)');
  t.is(
    array(u8(), { size: 'remainder' }).description,
    'array(u8(be); remainder)'
  );
  t.is(array(u8(), { size: u8() }).description, 'array(u8(be); u8(be))');
  t.is(
    array(u8(), { size: u8({ endian: Endian.Little }) }).description,
    'array(u8(be); u8(le))'
  );

  // Custom.
  t.is(
    array(u8(), { description: 'My custom description' }).description,
    'My custom description'
  );
});

test('sizes', (t) => {
  const { array, u8, u32, string } = new BeetSerializer();
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

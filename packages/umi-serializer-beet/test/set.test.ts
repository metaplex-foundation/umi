import test from 'ava';
import { Endian } from '@metaplex-foundation/umi';
import { createBeetSerializer } from '../src';
import { s, d } from './_helpers';

test('prefixed (de)serialization', (t) => {
  const { set, u8, string, u64 } = createBeetSerializer();

  // Empty.
  s(t, set(u8()), new Set(), '00000000'); // 4-bytes prefix.
  d(t, set(u8()), '00000000', new Set(), 4);

  // Empty with custom prefix.
  s(t, set(u8(), { size: u8() }), new Set(), '00'); // 1-byte prefix.
  d(t, set(u8(), { size: u8() }), '00', new Set(), 1);

  // Numbers.
  s(t, set(u8()), new Set([42, 1, 2]), '030000002a0102');
  d(t, set(u8()), '030000002a0102', new Set([42, 1, 2]), 7);
  d(t, set(u8()), ['ffff030000002a0102', 2], new Set([42, 1, 2]), 9);

  // Strings.
  s(t, set(string()), new Set(['a', 'b']), '0200000001000000610100000062');
  d(t, set(string()), '0200000001000000610100000062', new Set(['a', 'b']), 14);

  // Different From and To types.
  const setU64 = set<number | bigint, bigint>(u64());
  s(t, setU64, new Set([2]), '010000000200000000000000');
  d(t, setU64, '010000000200000000000000', new Set([2n]), 12);
});

test('fixed (de)serialization', (t) => {
  const { set, u8, string, u64 } = createBeetSerializer();

  // Empty.
  s(t, set(u8(), { size: 0 }), new Set(), '');
  d(t, set(u8(), { size: 0 }), '', new Set(), 0);

  // Numbers.
  s(t, set(u8(), { size: 3 }), new Set([42, 1, 2]), '2a0102');
  d(t, set(u8(), { size: 3 }), '2a0102', new Set([42, 1, 2]), 3);
  d(t, set(u8(), { size: 3 }), ['ffff2a0102', 2], new Set([42, 1, 2]), 5);

  // Strings.
  s(t, set(string(), { size: 2 }), new Set(['a', 'b']), '01000000610100000062');
  d(
    t,
    set(string(), { size: 2 }),
    '01000000610100000062',
    new Set(['a', 'b']),
    10
  );

  // Different From and To types.
  const setU64 = set<number | bigint, bigint>(u64(), { size: 1 });
  s(t, setU64, new Set([2]), '0200000000000000');
  d(t, setU64, '0200000000000000', new Set([2n]), 8);

  // It fails if the set has a different size.
  t.throws(() => set(u8(), { size: 1 }).serialize(new Set()), {
    message: (m: string) =>
      m.includes('Expected set to have 1 items but got 0.'),
  });
  t.throws(
    () => set(string(), { size: 2 }).serialize(new Set(['a', 'b', 'c'])),
    {
      message: (m: string) =>
        m.includes('Expected set to have 2 items but got 3.'),
    }
  );
});

test('remainder (de)serialization', (t) => {
  const { set, u8, string, u64 } = createBeetSerializer();
  const remainder = { size: 'remainder' } as const;

  // Empty.
  s(t, set(u8(), remainder), new Set(), '');
  d(t, set(u8(), remainder), '', new Set(), 0);

  // Numbers.
  s(t, set(u8(), remainder), new Set([42, 1, 2]), '2a0102');
  d(t, set(u8(), remainder), '2a0102', new Set([42, 1, 2]), 3);
  d(t, set(u8(), remainder), ['ffff2a0102', 2], new Set([42, 1, 2]), 5);

  // Strings.
  s(t, set(string({ size: 1 }), remainder), new Set(['a', 'b']), '6162');
  d(t, set(string({ size: 1 }), remainder), '6162', new Set(['a', 'b']), 2);

  // Different From and To types.
  const setU64 = set<number | bigint, bigint>(u64(), remainder);
  s(t, setU64, new Set([2]), '0200000000000000');
  d(t, setU64, '0200000000000000', new Set([2n]), 8);

  // It fails with variable size items.
  t.throws(() => set(string(), remainder), {
    message: (m) =>
      m.includes('Serializers of "remainder" size must have fixed-size items'),
  });
});

test('description', (t) => {
  const { set, u8, u16 } = createBeetSerializer();

  // Size.
  t.is(set(u8(), { size: 42 }).description, 'set(u8; 42)');
  t.is(set(u8(), { size: 'remainder' }).description, 'set(u8; remainder)');
  t.is(set(u8()).description, 'set(u8; u32(le))');
  t.is(set(u8(), { size: u16() }).description, 'set(u8; u16(le))');
  t.is(
    set(u8(), { size: u16({ endian: Endian.Big }) }).description,
    'set(u8; u16(be))'
  );

  // Custom.
  t.is(
    set(u8(), { description: 'My custom description' }).description,
    'My custom description'
  );
});

test('sizes', (t) => {
  const { set, u8, u32, string } = createBeetSerializer();
  t.is(set(u8()).fixedSize, null);
  t.is(set(u8()).maxSize, null);
  t.is(set(u8(), { size: u8() }).fixedSize, null);
  t.is(set(u8(), { size: u8() }).maxSize, null);
  t.is(set(u8(), { size: 'remainder' }).fixedSize, null);
  t.is(set(u8(), { size: 'remainder' }).maxSize, null);
  t.is(set(u8(), { size: 42 }).fixedSize, 42);
  t.is(set(u8(), { size: 42 }).maxSize, 42);
  t.is(set(u32(), { size: 42 }).fixedSize, 4 * 42);
  t.is(set(u32(), { size: 42 }).maxSize, 4 * 42);
  t.is(set(string(), { size: 42 }).fixedSize, null);
  t.is(set(string(), { size: 42 }).fixedSize, null);
  t.is(set(string(), { size: 0 }).maxSize, 0);
  t.is(set(string(), { size: 0 }).maxSize, 0);
});

import test from 'ava';
import { Endian } from '@metaplex-foundation/umi';
import { createBeetSerializer } from '../src';
import { s, d } from './_helpers';

test('prefixed (de)serialization', (t) => {
  const { map, u8, string, u64 } = createBeetSerializer();

  // Empty.
  s(t, map(u8(), u8()), new Map(), '00000000'); // 4-bytes prefix.
  d(t, map(u8(), u8()), '00000000', new Map(), 4);

  // Empty with custom prefix.
  s(t, map(u8(), u8(), { size: u8() }), new Map(), '00'); // 1-byte prefix.
  d(t, map(u8(), u8(), { size: u8() }), '00', new Map(), 1);

  // Numbers.
  s(t, map(u8(), u8()), new Map([[1, 2]]), '010000000102');
  d(t, map(u8(), u8()), '010000000102', new Map([[1, 2]]), 6);
  d(t, map(u8(), u8()), ['ffff010000000102', 2], new Map([[1, 2]]), 8);

  // Strings.
  const letters = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  s(t, map(string(), u8()), letters, '02000000010000006101010000006202');
  d(t, map(string(), u8()), '02000000010000006101010000006202', letters, 16);

  // Different From and To types.
  const mapU8U64 = map<number, number | bigint, number, bigint>(u8(), u64());
  s(t, mapU8U64, new Map().set(42, 2), '010000002a0200000000000000');
  d(t, mapU8U64, '010000002a0200000000000000', new Map().set(42, 2n));
});

test('fixed (de)serialization', (t) => {
  const { map, u8, string, u64 } = createBeetSerializer();

  // Empty.
  s(t, map(u8(), u8(), { size: 0 }), new Map(), '');
  d(t, map(u8(), u8(), { size: 0 }), '', new Map(), 0);

  // Numbers.
  s(t, map(u8(), u8(), { size: 1 }), new Map([[1, 2]]), '0102');
  d(t, map(u8(), u8(), { size: 1 }), '0102', new Map([[1, 2]]), 2);
  d(t, map(u8(), u8(), { size: 1 }), ['ffff0102', 2], new Map([[1, 2]]), 4);

  // Strings.
  const letters = map(string(), u8(), { size: 2 });
  const lettersMap = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  s(t, letters, lettersMap, '010000006101010000006202');
  d(t, letters, '010000006101010000006202', lettersMap, 12);

  // Different From and To types.
  const mapU64 = map<number, number | bigint, number, bigint>(u8(), u64(), {
    size: 1,
  });
  s(t, mapU64, new Map([[1, 2]]), '010200000000000000');
  d(t, mapU64, '010200000000000000', new Map([[1, 2n]]), 9);

  // It fails if the map has a different size.
  t.throws(() => map(u8(), u8(), { size: 1 }).serialize(new Map()), {
    message: (m: string) =>
      m.includes('Expected map to have 1 items but got 0.'),
  });
  t.throws(() => letters.serialize(lettersMap.set('c', 3)), {
    message: (m: string) =>
      m.includes('Expected map to have 2 items but got 3.'),
  });
});

test('remainder (de)serialization', (t) => {
  const { map, u8, string, u64 } = createBeetSerializer();
  const remainder = { size: 'remainder' } as const;

  // Empty.
  s(t, map(u8(), u8(), remainder), new Map(), '');
  d(t, map(u8(), u8(), remainder), '', new Map(), 0);

  // Numbers.
  s(t, map(u8(), u8(), remainder), new Map([[1, 2]]), '0102');
  d(t, map(u8(), u8(), remainder), '0102', new Map([[1, 2]]), 2);
  d(t, map(u8(), u8(), remainder), ['ffff0102', 2], new Map([[1, 2]]), 4);

  // Strings.
  const letters = map(string({ size: 1 }), u8(), { size: 2 });
  const lettersMap = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  s(t, letters, lettersMap, '61016202');
  d(t, letters, '61016202', lettersMap, 4);

  // Different From and To types.
  const mapU64 = map<number, number | bigint, number, bigint>(
    u8(),
    u64(),
    remainder
  );
  s(t, mapU64, new Map([[1, 2]]), '010200000000000000');
  d(t, mapU64, '010200000000000000', new Map([[1, 2n]]), 9);

  // It fails with variable size items.
  t.throws(() => map(u8(), string(), remainder), {
    message: (m) =>
      m.includes('Serializers of "remainder" size must have fixed-size items'),
  });
});

test('description', (t) => {
  const { map, u8, u16, string } = createBeetSerializer();

  // Size.
  t.is(map(u8(), u8(), { size: 42 }).description, 'map(u8, u8; 42)');
  t.is(
    map(u8(), u8(), { size: 'remainder' }).description,
    'map(u8, u8; remainder)'
  );
  t.is(map(u8(), u8()).description, 'map(u8, u8; u32(le))');
  t.is(
    map(string(), u8()).description,
    'map(string(utf8; u32(le)), u8; u32(le))'
  );
  t.is(map(u8(), u8(), { size: u16() }).description, 'map(u8, u8; u16(le))');
  t.is(
    map(u8(), u8(), { size: u16({ endian: Endian.Big }) }).description,
    'map(u8, u8; u16(be))'
  );

  // Custom.
  t.is(
    map(u8(), u8(), { description: 'My custom description' }).description,
    'My custom description'
  );
});

test('sizes', (t) => {
  const { map, u8, u32, string } = createBeetSerializer();
  t.is(map(u8(), u8()).fixedSize, null);
  t.is(map(u8(), u8()).maxSize, null);
  t.is(map(u8(), u8(), { size: u8() }).fixedSize, null);
  t.is(map(u8(), u8(), { size: u8() }).maxSize, null);
  t.is(map(u8(), u8(), { size: 'remainder' }).fixedSize, null);
  t.is(map(u8(), u8(), { size: 'remainder' }).maxSize, null);
  t.is(map(u8(), u8(), { size: 42 }).fixedSize, 2 * 42);
  t.is(map(u8(), u8(), { size: 42 }).maxSize, 2 * 42);
  t.is(map(u8(), u32(), { size: 42 }).fixedSize, 5 * 42);
  t.is(map(u8(), u32(), { size: 42 }).maxSize, 5 * 42);
  t.is(map(u8(), string(), { size: 42 }).fixedSize, null);
  t.is(map(u8(), string(), { size: 42 }).fixedSize, null);
  t.is(map(u8(), string(), { size: 0 }).maxSize, 0);
  t.is(map(u8(), string(), { size: 0 }).maxSize, 0);
});

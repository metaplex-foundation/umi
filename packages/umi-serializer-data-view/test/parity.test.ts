import {
  createBaseUmi,
  none,
  publicKey,
  Serializer,
  SerializerInterface,
  some,
} from '@metaplex-foundation/umi';
import * as ref from '@metaplex-foundation/umi-serializers';
import test, { ExecutionContext } from 'ava';
import { dataViewSerializer } from '../src';

/**
 * Differential suite: every serializer produced by the DataView
 * implementation must emit exactly the same bytes — and deserialize
 * them back to the same value and offset — as the reference pure
 * TypeScript implementation in `@metaplex-foundation/umi-serializers`.
 */
const dv: SerializerInterface = createBaseUmi().use(dataViewSerializer())
  .serializer;

const assertParity = <T, U extends T>(
  t: ExecutionContext,
  actual: Serializer<T, U>,
  reference: Serializer<T, U>,
  values: T[]
): void => {
  values.forEach((value) => {
    const actualBytes = actual.serialize(value);
    const referenceBytes = reference.serialize(value);
    t.deepEqual(actualBytes, referenceBytes);
    t.deepEqual(actual.deserialize(referenceBytes), reference.deserialize(referenceBytes));
  });
};

test('unsigned integers match the reference implementation', (t) => {
  assertParity(t, dv.u8(), ref.u8(), [0, 1, 127, 255]);
  assertParity(t, dv.u16(), ref.u16(), [0, 258, 65_535]);
  assertParity(t, dv.u32(), ref.u32(), [0, 1, 4_294_967_295]);
  assertParity(t, dv.u64(), ref.u64(), [0, 42, 2n ** 64n - 1n]);
  assertParity(t, dv.u128(), ref.u128(), [0, 1n, 2n ** 128n - 1n]);
});

test('signed integers match the reference implementation', (t) => {
  assertParity(t, dv.i8(), ref.i8(), [-128, -1, 0, 127]);
  assertParity(t, dv.i16(), ref.i16(), [-32_768, -1, 0, 32_767]);
  assertParity(t, dv.i32(), ref.i32(), [-2_147_483_648, -1, 0, 2_147_483_647]);
  assertParity(t, dv.i64(), ref.i64(), [-(2n ** 63n), -1n, 0, 2n ** 63n - 1n]);
  assertParity(t, dv.i128(), ref.i128(), [-(2n ** 127n), -1n, 0, 2n ** 127n - 1n]);
});

test('floats match the reference implementation', (t) => {
  assertParity(t, dv.f32(), ref.f32(), [0, 1.5, -3.25]);
  assertParity(t, dv.f64(), ref.f64(), [0, Math.PI, -1e300]);
});

test('booleans and units match the reference implementation', (t) => {
  assertParity(t, dv.bool(), ref.bool(), [true, false]);
  assertParity(
    t,
    dv.bool({ size: dv.u32() }),
    ref.bool({ size: ref.u32() }),
    [true, false]
  );
  assertParity(t, dv.unit(), ref.unit(), [undefined]);
});

test('bytes match the reference implementation', (t) => {
  const values = [new Uint8Array([]), new Uint8Array([1, 2, 3])];
  assertParity(t, dv.bytes(), ref.bytes(), values);
  assertParity(
    t,
    dv.bytes({ size: 3 }),
    ref.bytes({ size: 3 }),
    [new Uint8Array([1, 2, 3])]
  );
  assertParity(
    t,
    dv.bytes({ size: dv.u16() }),
    ref.bytes({ size: ref.u16() }),
    values
  );
});

test('strings match the reference implementation', (t) => {
  const values = ['', 'Hello World!', '語'];
  assertParity(t, dv.string(), ref.string(), values);
  assertParity(
    t,
    dv.string({ size: dv.u8() }),
    ref.string({ size: ref.u8() }),
    values
  );
  assertParity(t, dv.string({ size: 5 }), ref.string({ size: 5 }), ['Hello']);
});

test('public keys match the reference implementation', (t) => {
  assertParity(t, dv.publicKey(), ref.publicKey(), [
    publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9'),
    publicKey('11111111111111111111111111111111'),
  ]);
});

test('tuples, arrays, maps and sets match the reference implementation', (t) => {
  assertParity(
    t,
    dv.tuple([dv.u8(), dv.string()]),
    ref.tuple([ref.u8(), ref.string()]),
    [[42, 'Hello'] as [number, string]]
  );
  assertParity(t, dv.array(dv.u16()), ref.array(ref.u16()), [
    [],
    [1, 2, 3],
  ]);
  assertParity(
    t,
    dv.array(dv.u16(), { size: 3 }),
    ref.array(ref.u16(), { size: 3 }),
    [[1, 2, 3]]
  );
  assertParity(
    t,
    dv.map(dv.u8(), dv.string()),
    ref.map(ref.u8(), ref.string()),
    [new Map(), new Map([[1, 'one'], [2, 'two']])]
  );
  assertParity(t, dv.set(dv.u32()), ref.set(ref.u32()), [
    new Set(),
    new Set([1, 2, 3]),
  ]);
});

test('options and nullables match the reference implementation', (t) => {
  assertParity(t, dv.option(dv.u32()), ref.option(ref.u32()), [
    some(42),
    none<number>(),
  ]);
  assertParity(
    t,
    dv.option(dv.u32(), { fixed: true }),
    ref.option(ref.u32(), { fixed: true }),
    [some(42), none<number>()]
  );
  assertParity(t, dv.nullable(dv.string()), ref.nullable(ref.string()), [
    'Hello',
    null,
  ]);
});

test('structs match the reference implementation', (t) => {
  type Person = { name: string; age: number; keys: number[] };
  const person: Person = { name: 'Alice', age: 42, keys: [1, 2] };
  assertParity(
    t,
    dv.struct<Person>([
      ['name', dv.string()],
      ['age', dv.u8()],
      ['keys', dv.array(dv.u16())],
    ]),
    ref.struct<Person>([
      ['name', ref.string()],
      ['age', ref.u8()],
      ['keys', ref.array(ref.u16())],
    ]),
    [person]
  );
});

test('scalar enums match the reference implementation', (t) => {
  enum Direction {
    Up,
    Down,
  }
  assertParity(
    t,
    dv.enum(Direction),
    ref.scalarEnum(Direction),
    [Direction.Up, Direction.Down]
  );
});

test('data enums match the reference implementation', (t) => {
  type Circle = { __kind: 'Circle'; radius: number };
  type Rectangle = { __kind: 'Rectangle'; width: number; height: number };
  type Shape = Circle | Rectangle;
  const variants = [
    { __kind: 'Circle', radius: 4 } as Shape,
    { __kind: 'Rectangle', width: 2, height: 3 } as Shape,
  ];
  assertParity(
    t,
    dv.dataEnum<Shape>([
      ['Circle', dv.struct<Omit<Circle, '__kind'>>([['radius', dv.u16()]])],
      [
        'Rectangle',
        dv.struct<Omit<Rectangle, '__kind'>>([
          ['width', dv.u8()],
          ['height', dv.u8()],
        ]),
      ],
    ]),
    ref.dataEnum<Shape>([
      ['Circle', ref.struct<Omit<Circle, '__kind'>>([['radius', ref.u16()]])],
      [
        'Rectangle',
        ref.struct<Omit<Rectangle, '__kind'>>([
          ['width', ref.u8()],
          ['height', ref.u8()],
        ]),
      ],
    ]),
    variants
  );
});

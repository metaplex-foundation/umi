import test from 'ava';
import { DataEnumToSerializerTuple } from '@metaplex-foundation/umi';
import { createBeetSerializer } from '../src';
import { s, d } from './_helpers';

type WebEvent =
  | { __kind: 'PageLoad' } // Empty variant.
  | { __kind: 'Click'; x: number; y: number } // Struct variant.
  | { __kind: 'KeyPress'; fields: [string] } // Tuple variant.
  | { __kind: 'PageUnload' }; // Empty variant (using empty struct).

const getWebEvent = (): DataEnumToSerializerTuple<WebEvent, WebEvent> => {
  const { unit, struct, tuple, string, u8 } = createBeetSerializer();
  return [
    ['PageLoad', unit()],
    [
      'Click',
      struct<{ x: number; y: number }>([
        ['x', u8()],
        ['y', u8()],
      ]),
    ],
    ['KeyPress', struct<{ fields: [string] }>([['fields', tuple([string()])]])],
    ['PageUnload', struct<{}>([])],
  ];
};

type SameSizeVariants =
  | { __kind: 'A'; value: number }
  | { __kind: 'B'; x: number; y: number }
  | { __kind: 'C'; items: Array<boolean> };

const getSameSizeVariants = (): DataEnumToSerializerTuple<
  SameSizeVariants,
  SameSizeVariants
> => {
  const { struct, u8, u16, bool, array } = createBeetSerializer();
  return [
    ['A', struct<any>([['value', u16()]])],
    [
      'B',
      struct<any>([
        ['x', u8()],
        ['y', u8()],
      ]),
    ],
    ['C', struct<any>([['items', array(bool(), { size: 2 })]])],
  ];
};

type U64EnumFrom = { __kind: 'A' } | { __kind: 'B'; value: number | bigint };
type U64EnumTo = { __kind: 'A' } | { __kind: 'B'; value: bigint };
const getU64Enum = (): DataEnumToSerializerTuple<U64EnumFrom, U64EnumTo> => {
  const { unit, struct, u64 } = createBeetSerializer();
  return [
    ['A', unit()],
    [
      'B',
      struct<{ value: bigint | number }, { value: bigint }>([['value', u64()]]),
    ],
  ];
};

test('empty variant (de)serialization', (t) => {
  const { dataEnum } = createBeetSerializer();
  const pageLoad: WebEvent = { __kind: 'PageLoad' };
  s(t, dataEnum(getWebEvent()), pageLoad, '00');
  d(t, dataEnum(getWebEvent()), '00', pageLoad, 1);
  d(t, dataEnum(getWebEvent()), ['ffff00', 2], pageLoad, 3);
  const pageUnload: WebEvent = { __kind: 'PageUnload' };
  s(t, dataEnum(getWebEvent()), pageUnload, '03');
  d(t, dataEnum(getWebEvent()), '03', pageUnload, 1);
  d(t, dataEnum(getWebEvent()), ['ffff03', 2], pageUnload, 3);
});

test('struct variant (de)serialization', (t) => {
  const { dataEnum } = createBeetSerializer();
  const click = (x: number, y: number): WebEvent => ({ __kind: 'Click', x, y });
  s(t, dataEnum(getWebEvent()), click(0, 0), '010000');
  d(t, dataEnum(getWebEvent()), '010000', click(0, 0), 3);
  d(t, dataEnum(getWebEvent()), ['ffff010000', 2], click(0, 0), 5);
  s(t, dataEnum(getWebEvent()), click(1, 2), '010102');
  d(t, dataEnum(getWebEvent()), '010102', click(1, 2), 3);
  d(t, dataEnum(getWebEvent()), ['ffff010102', 2], click(1, 2), 5);
});

test('tuple variant (de)serialization', (t) => {
  const { dataEnum } = createBeetSerializer();
  const press = (k: string): WebEvent => ({ __kind: 'KeyPress', fields: [k] });
  s(t, dataEnum(getWebEvent()), press(''), '0200000000');
  d(t, dataEnum(getWebEvent()), '0200000000', press(''), 5);
  d(t, dataEnum(getWebEvent()), ['ffff0200000000', 2], press(''), 7);
  s(t, dataEnum(getWebEvent()), press('1'), '020100000031');
  d(t, dataEnum(getWebEvent()), '020100000031', press('1'), 6);
  d(t, dataEnum(getWebEvent()), ['ffff020100000031', 2], press('1'), 8);
  s(t, dataEnum(getWebEvent()), press('語'), '0203000000e8aa9e');
  s(t, dataEnum(getWebEvent()), press('enter'), '0205000000656e746572');
});

test('invalid variant (de)serialization', (t) => {
  const { dataEnum } = createBeetSerializer();
  t.throws(
    () => dataEnum(getWebEvent()).serialize({ __kind: 'Missing' } as any),
    {
      message: (m: string) =>
        m.includes(
          'Invalid data enum variant. Got "Missing", ' +
            'expected one of [PageLoad, Click, KeyPress, PageUnload]'
        ),
    }
  );
  t.throws(() => dataEnum(getWebEvent()).deserialize(new Uint8Array([4])), {
    message: (m: string) =>
      m.includes(
        'Data enum index "4" is out of range. Index should be between 0 and 3.'
      ),
  });
});

test('(de)serialization with different From and To types', (t) => {
  const { dataEnum } = createBeetSerializer();
  const x = dataEnum(getU64Enum());
  s(t, x, { __kind: 'B', value: 2 }, '010200000000000000');
  d(t, x, '010200000000000000', { __kind: 'B', value: 2n }, 9);
});

test('(de)serialization with custom prefix', (t) => {
  const { dataEnum, u32 } = createBeetSerializer();
  const x = dataEnum(getSameSizeVariants(), { size: u32() });
  s(t, x, { __kind: 'A', value: 42 }, '000000002a00');
  d(t, x, '000000002a00', { __kind: 'A', value: 42 }, 6);
});

test('description', (t) => {
  const { dataEnum, u32 } = createBeetSerializer();
  t.is(
    dataEnum(getWebEvent()).description,
    'dataEnum(' +
      'PageLoad: unit, ' +
      'Click: struct(x: u8, y: u8), ' +
      'KeyPress: struct(fields: tuple(string(utf8; u32(le)))), ' +
      'PageUnload: struct()' +
      '; u8)'
  );
  t.is(
    dataEnum(getSameSizeVariants()).description,
    'dataEnum(' +
      'A: struct(value: u16(le)), ' +
      'B: struct(x: u8, y: u8), ' +
      'C: struct(items: array(bool(u8); 2))' +
      '; u8)'
  );
  t.is(
    dataEnum(getU64Enum()).description,
    'dataEnum(A: unit, B: struct(value: u64(le)); u8)'
  );
  t.is(
    dataEnum(getU64Enum(), { size: u32() }).description,
    'dataEnum(A: unit, B: struct(value: u64(le)); u32(le))'
  );
  t.is(
    dataEnum(getWebEvent(), { description: 'my data enum' }).description,
    'my data enum'
  );
});

test('sizes', (t) => {
  const { dataEnum, u32 } = createBeetSerializer();
  t.is(dataEnum(getWebEvent()).fixedSize, null);
  t.is(dataEnum(getWebEvent()).maxSize, null);
  t.is(dataEnum(getSameSizeVariants()).fixedSize, 3);
  t.is(dataEnum(getSameSizeVariants()).maxSize, 3);
  t.is(dataEnum(getSameSizeVariants(), { size: u32() }).fixedSize, 6);
  t.is(dataEnum(getSameSizeVariants(), { size: u32() }).maxSize, 6);
  t.is(dataEnum(getU64Enum()).fixedSize, null);
  t.is(dataEnum(getU64Enum()).maxSize, 9);
});

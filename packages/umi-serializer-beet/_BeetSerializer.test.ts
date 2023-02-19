import {
  base16,
  DataEnumToSerializerTuple,
  none,
  publicKey as toPublicKey,
  Serializer,
  some,
  utf8,
} from '@metaplex-foundation/umi-core';
import { Keypair as Web3Keypair } from '@solana/web3.js';
import test, { ThrowsExpectation } from 'ava';
import { BeetSerializer, DeserializingEmptyBufferError } from './src';

test('it can serialize maps', (t) => {
  const { map, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  t.is(map(u8, u8).description, 'map(u8, u8)');
  t.is(map(string(), u8).description, 'map(string(u32, utf8), u8)');

  // Description can be overridden.
  t.is(map(string(), string(), undefined, 'my map').description, 'my map');

  // Examples with numbers.
  const numberMap = map(u8, u8);
  t.is(numberMap.fixedSize, null);
  t.is(numberMap.maxSize, null);
  t.is(s(numberMap, new Map()), '00000000');
  t.is(s(numberMap, new Map([[1, 2]])), '010000000102');
  t.deepEqual(d(numberMap, '010000000102'), new Map([[1, 2]]));
  t.deepEqual(sd(numberMap, new Map()), new Map());
  t.deepEqual(sd(numberMap, new Map([[1, 2]])), new Map([[1, 2]]));
  t.is(doffset(numberMap, '00000000'), 4);
  t.is(doffset(numberMap, '010000000102'), 4 + 2);
  t.is(doffset(numberMap, 'ff010000000102', 1), 1 + 4 + 2);

  // Example with strings and numbers.
  const letterMap = map(string(), u8);
  t.is(s(letterMap, new Map()), '00000000');
  const letters = new Map([
    ['a', 1],
    ['b', 2],
  ]);
  t.is(
    s(letterMap, letters),
    '02000000' + // 2 items.
      '0100000061' + // String 'a'.
      '01' + // Number 1.
      '0100000062' + // String 'b'.
      '02' // Number 2.
  );
  t.deepEqual(d(letterMap, 'ff00000000', 1), new Map());
  t.deepEqual(sd(letterMap, new Map()), new Map());
  t.deepEqual(sd(letterMap, letters), letters);
  t.is(doffset(letterMap, '00000000'), 4);

  // Example with different From and To types.
  const mapU8U64 = map<number, number | bigint, number, bigint>(u8, u64);
  t.deepEqual(s(mapU8U64, new Map().set(42, 2)), '010000002a0200000000000000');
  t.deepEqual(d(mapU8U64, '010000002a0200000000000000'), new Map().set(42, 2n));
});

test('it can serialize sets', (t) => {
  const { set, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  t.is(set(u8).description, 'set(u8)');
  t.is(set(string()).description, 'set(string(u32, utf8))');

  // Description can be overridden.
  t.is(set(string(), undefined, 'my set').description, 'my set');

  // Examples with numbers.
  t.is(set(u8).fixedSize, null);
  t.is(set(u8).maxSize, null);
  t.is(s(set(u8), new Set()), '00000000');
  t.is(s(set(u8), new Set([1, 2, 3])), '03000000010203');
  t.deepEqual(d(set(u8), '03000000010203'), new Set([1, 2, 3]));
  t.deepEqual(sd(set(u8), new Set()), new Set());
  t.deepEqual(sd(set(u8), new Set([1, 2, 3])), new Set([1, 2, 3]));
  t.is(doffset(set(u8), '00000000'), 4);
  t.is(doffset(set(u8), '03000000010203'), 4 + 3);
  t.is(doffset(set(u8), 'ff03000000010203', 1), 1 + 4 + 3);

  // Example with strings.
  t.is(s(set(string()), new Set()), '00000000');
  t.is(
    s(set(string()), new Set(['a', 'b', 'c'])),
    '03000000' + // 3 items.
      '0100000061' + // String 'a'.
      '0100000062' + // String 'b'.
      '0100000063' // String 'b'.
  );
  t.deepEqual(d(set(string()), 'ff00000000', 1), new Set());
  t.deepEqual(sd(set(string()), new Set()), new Set());
  t.deepEqual(sd(set(string()), new Set(['語'])), new Set(['語']));

  // Example with different From and To types.
  const setU64 = set<number | bigint, bigint>(u64);
  t.deepEqual(s(setU64, new Set([2])), '010000000200000000000000');
  t.deepEqual(d(setU64, '010000000200000000000000'), new Set([2n]));
});

test('it can serialize options', (t) => {
  const { option, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the option definition.
  t.is(option(u8).description, 'option(u8)');
  t.is(option(string()).description, 'option(string(u32, utf8))');

  // Description can be overridden.
  t.is(option(string(), undefined, 'my option').description, 'my option');

  // Fixed size.
  t.is(option(unit).fixedSize, 1);
  t.is(option(u8).fixedSize, null);
  t.is(option(u64).fixedSize, null);
  t.is(option(string()).fixedSize, null);

  // Max size.
  t.is(option(unit).maxSize, 1);
  t.is(option(u8).maxSize, 1 + 1);
  t.is(option(u64).maxSize, 1 + 8);
  t.is(option(string()).maxSize, null);

  // Examples with none.
  t.is(s(option(u8), none()), '00');
  t.is(s(option(string()), none<string>()), '00');
  t.deepEqual(d(option(u8), '00'), none());
  t.deepEqual(d(option(u8), 'ffff00', 2), none());
  t.deepEqual(sd(option(u8), none()), none());

  // Examples with numbers.
  t.is(s(option(u8), some(42)), '012a');
  t.deepEqual(d(option(u8), '012a'), some(42));
  t.deepEqual(d(option(u8), 'ff012a', 1), some(42));
  t.deepEqual(sd(option(u8), some(0)), some(0));
  t.deepEqual(sd(option(u8), some(1)), some(1));
  t.is(doffset(option(u8), '012a'), 1 + 1);
  t.is(doffset(option(u8), 'ffffffff012a', 4), 4 + 1 + 1);

  // Example with strings.
  t.deepEqual(sd(option(string()), some('Hello')), some('Hello'));
  t.deepEqual(sd(option(string()), some('語')), some('語'));

  // Example with different From and To types.
  const optionU64 = option<number | bigint, bigint>(u64);
  t.deepEqual(s(optionU64, some(2)), '010200000000000000');
  t.deepEqual(d(optionU64, '010200000000000000'), some(2n));

  // Custom prefix serializer
  t.is(option(u8, u32).fixedSize, null);
  t.is(option(u8, u32).maxSize, 4 + 1);
  t.is(s(option(u8, u32), some(42)), '010000002a');
  t.deepEqual(d(option(u8, u32), '010000002a'), some(42));
});

test('it can serialize fixed options', (t) => {
  const { fixedOption, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the fixed option definition.
  t.is(fixedOption(u8).description, 'fixedOption(u8)');

  // Description can be overridden.
  t.is(fixedOption(u8, undefined, 'my option').description, 'my option');

  // Fixed options must have fixed size.
  t.is(fixedOption(unit).fixedSize, 1);
  t.is(fixedOption(unit).maxSize, 1);
  t.is(fixedOption(u8).fixedSize, 1 + 1);
  t.is(fixedOption(u8).maxSize, 1 + 1);
  t.is(fixedOption(u64).fixedSize, 1 + 8);
  t.is(fixedOption(u64).maxSize, 1 + 8);
  t.throws(() => fixedOption(string()), {
    message: (m: string) =>
      m.includes('fixedOption can only be used with fixed size serializers'),
  });

  // Examples with some.
  t.is(s(fixedOption(u64), some(42)), '012a00000000000000');
  t.deepEqual(d(fixedOption(u64), '012a00000000000000'), some(42n));
  t.deepEqual(doffset(fixedOption(u64), '012a00000000000000'), 1 + 8);
  t.deepEqual(d(fixedOption(u64), 'ffff012a00000000000000', 2), some(42n));
  t.deepEqual(sd(fixedOption(u64), some(42n)), some(42n));

  // Examples with none.
  t.is(s(fixedOption(u64), none()), '000000000000000000');
  t.deepEqual(d(fixedOption(u64), '000000000000000000'), none());
  t.deepEqual(doffset(fixedOption(u64), '000000000000000000'), 1 + 8);
  t.deepEqual(d(fixedOption(u64), 'ffff000000000000000000', 2), none());
  t.deepEqual(sd(fixedOption(u64), none()), none());

  // Example with different From and To types.
  const optionU64 = fixedOption<number | bigint, bigint>(u64);
  t.deepEqual(s(optionU64, some(2)), '010200000000000000');
  t.deepEqual(d(optionU64, '010200000000000000'), some(2n));

  // Custom prefix serializer
  t.is(fixedOption(u8, u32).fixedSize, 4 + 1);
  t.is(fixedOption(u8, u32).maxSize, 4 + 1);
  t.is(s(fixedOption(u8, u32), some(42)), '010000002a');
  t.deepEqual(d(fixedOption(u8, u32), '010000002a'), some(42));
});

test('it can serialize nullables', (t) => {
  const { nullable, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the nullable definition.
  t.is(nullable(u8).description, 'nullable(u8)');
  t.is(nullable(string()).description, 'nullable(string(u32, utf8))');

  // Description can be overridden.
  t.is(nullable(string(), undefined, 'my nullable').description, 'my nullable');

  // Fixed size.
  t.is(nullable(unit).fixedSize, 1);
  t.is(nullable(u8).fixedSize, null);
  t.is(nullable(u64).fixedSize, null);
  t.is(nullable(string()).fixedSize, null);

  // Max size.
  t.is(nullable(unit).maxSize, 1);
  t.is(nullable(u8).maxSize, 1 + 1);
  t.is(nullable(u64).maxSize, 1 + 8);
  t.is(nullable(string()).maxSize, null);

  // Examples with numbers.
  t.is(s(nullable(u8), null), '00');
  t.is(s(nullable(u8), 42), '012a');
  t.is(d(nullable(u8), '012a'), 42);
  t.is(d(nullable(u8), 'ff012a', 1), 42);
  t.is(d(nullable(u8), 'ffff00', 2), null);
  t.is(sd(nullable(u8), null), null);
  t.is(sd(nullable(u8), 0), 0);
  t.is(sd(nullable(u8), 1), 1);
  t.is(doffset(nullable(u8), '012a'), 1 + 1);
  t.is(doffset(nullable(u8), 'ffffffff012a', 4), 4 + 1 + 1);

  // More examples.
  t.is(sd(nullable(string()), null), null);
  t.is(sd(nullable(string()), 'Hello'), 'Hello');
  t.is(sd(nullable(string()), '語'), '語');

  // Example with different From and To types.
  const nullableU64 = nullable<number | bigint, bigint>(u64);
  t.deepEqual(s(nullableU64, 2), '010200000000000000');
  t.deepEqual(d(nullableU64, '010200000000000000'), 2n);

  // Custom prefix serializer
  t.is(nullable(u8, u32).fixedSize, null);
  t.is(nullable(u8, u32).maxSize, 4 + 1);
  t.is(s(nullable(u8, u32), 42), '010000002a');
  t.is(d(nullable(u8, u32), '010000002a'), 42);
});

test('it can serialize fixed nullables', (t) => {
  const { fixedNullable, unit, u8, u32, u64, string } = new BeetSerializer();

  // Description matches the fixed nullable definition.
  t.is(fixedNullable(u8).description, 'fixedNullable(u8)');

  // Description can be overridden.
  t.is(fixedNullable(u8, undefined, 'my nullable').description, 'my nullable');

  // Fixed nullables must have fixed size.
  t.is(fixedNullable(unit).fixedSize, 1);
  t.is(fixedNullable(unit).maxSize, 1);
  t.is(fixedNullable(u8).fixedSize, 1 + 1);
  t.is(fixedNullable(u8).maxSize, 1 + 1);
  t.is(fixedNullable(u64).fixedSize, 1 + 8);
  t.is(fixedNullable(u64).maxSize, 1 + 8);
  t.throws(() => fixedNullable(string()), {
    message: (m: string) =>
      m.includes('fixedNullable can only be used with fixed size serializers'),
  });

  // Examples with some.
  t.is(s(fixedNullable(u64), 42), '012a00000000000000');
  t.deepEqual(d(fixedNullable(u64), '012a00000000000000'), 42n);
  t.deepEqual(doffset(fixedNullable(u64), '012a00000000000000'), 1 + 8);
  t.deepEqual(d(fixedNullable(u64), 'ffff012a00000000000000', 2), 42n);
  t.deepEqual(sd(fixedNullable(u64), 42n), 42n);

  // Examples with none.
  t.is(s(fixedNullable(u64), null), '000000000000000000');
  t.deepEqual(d(fixedNullable(u64), '000000000000000000'), null);
  t.deepEqual(doffset(fixedNullable(u64), '000000000000000000'), 1 + 8);
  t.deepEqual(d(fixedNullable(u64), 'ffff000000000000000000', 2), null);
  t.deepEqual(sd(fixedNullable(u64), null), null);

  // Example with different From and To types.
  const optionU64 = fixedNullable<number | bigint, bigint>(u64);
  t.deepEqual(s(optionU64, 2), '010200000000000000');
  t.deepEqual(d(optionU64, '010200000000000000'), 2n);

  // Custom prefix serializer
  t.is(fixedNullable(u8, u32).fixedSize, 4 + 1);
  t.is(fixedNullable(u8, u32).maxSize, 4 + 1);
  t.is(s(fixedNullable(u8, u32), 42), '010000002a');
  t.deepEqual(d(fixedNullable(u8, u32), '010000002a'), 42);
});

test('it can serialize structs', (t) => {
  const { struct, option, u8, u64, string } = new BeetSerializer();

  // Description matches the vec definition.
  const person = struct([
    ['name', string()],
    ['age', u8],
  ]);
  t.is(struct([['age', u8]]).description, 'struct(age: u8)');
  t.is(person.description, 'struct(name: string(u32, utf8), age: u8)');

  // Description can be overridden.
  t.is(struct([['age', u8]], 'my struct').description, 'my struct');

  // Fixed and max sizes.
  t.is(person.fixedSize, null);
  t.is(person.maxSize, null);
  t.is(struct([]).fixedSize, 0);
  t.is(struct([]).maxSize, 0);
  t.is(struct([['age', u8]]).fixedSize, 1);
  t.is(struct([['age', u8]]).maxSize, 1);
  t.is(struct([['age', option(u8)]]).fixedSize, null);
  t.is(struct([['age', option(u8)]]).maxSize, 2);
  const fixedPerson = struct([
    ['age', u8],
    ['balance', u64],
  ]);
  t.is(fixedPerson.fixedSize, 9);
  t.is(fixedPerson.maxSize, 9);

  // More examples.
  t.is(s(struct([]), {}), '');
  const alice = { name: 'Alice', age: 32 };
  t.is(s(person, alice), '05000000416c69636520');
  t.deepEqual(d(person, '05000000416c69636520'), alice);
  t.deepEqual(d(person, 'ff05000000416c69636520', 1), alice);
  t.deepEqual(sd(person, alice), alice);
  t.deepEqual(sd(person, { age: 1, name: 'Bob' }), { name: 'Bob', age: 1 });
  t.deepEqual(sd(person, { age: 1, name: 'Bob', dob: '1995-06-01' } as any), {
    name: 'Bob',
    age: 1,
  });

  // Example with different From and To types.
  const structU64 = struct<{ value: number | bigint }, { value: bigint }>([
    ['value', u64],
  ]);
  t.deepEqual(s(structU64, { value: 2 }), '0200000000000000');
  t.deepEqual(d(structU64, '0200000000000000'), { value: 2n });
});

test('it can serialize enums', (t) => {
  const { enum: scalarEnum } = new BeetSerializer();
  enum Empty {}
  enum Feedback {
    BAD,
    GOOD,
  }
  enum Direction {
    UP = 'Up',
    DOWN = 'Down',
    LEFT = 'Left',
    RIGHT = 'Right',
  }

  // Description matches the vec definition.
  t.is(scalarEnum(Empty).description, 'enum()');
  t.is(scalarEnum(Feedback).description, 'enum(BAD, GOOD)');
  t.is(scalarEnum(Direction).description, 'enum(Up, Down, Left, Right)');

  // Description can be overridden.
  t.is(scalarEnum(Direction, 'my enum').description, 'my enum');

  // Simple scalar enums.
  t.is(scalarEnum(Feedback).fixedSize, 1);
  t.is(s(scalarEnum(Feedback), 'BAD'), '00');
  t.is(s(scalarEnum(Feedback), '0'), '00');
  t.is(s(scalarEnum(Feedback), 0), '00');
  t.is(s(scalarEnum(Feedback), Feedback.BAD), '00');
  t.is(d(scalarEnum(Feedback), '00'), 0);
  t.is(d(scalarEnum(Feedback), '00'), Feedback.BAD);
  t.is(sd(scalarEnum(Feedback), Feedback.BAD), Feedback.BAD);
  t.is(sd(scalarEnum(Feedback), 0), 0);
  t.is(s(scalarEnum(Feedback), 'GOOD'), '01');
  t.is(s(scalarEnum(Feedback), '1'), '01');
  t.is(s(scalarEnum(Feedback), 1), '01');
  t.is(s(scalarEnum(Feedback), Feedback.GOOD), '01');
  t.is(d(scalarEnum(Feedback), '01'), 1);
  t.is(d(scalarEnum(Feedback), '01'), Feedback.GOOD);
  t.is(sd(scalarEnum(Feedback), Feedback.GOOD), Feedback.GOOD);
  t.is(sd(scalarEnum(Feedback), 1), 1);
  t.is(doffset(scalarEnum(Feedback), '01'), 1);
  t.is(doffset(scalarEnum(Feedback), 'ff01', 1), 2);

  // Scalar enums with string values.
  t.is(scalarEnum(Direction).fixedSize, 1);
  t.is(s(scalarEnum(Direction), Direction.UP), '00');
  t.is(s(scalarEnum(Direction), Direction.DOWN), '01');
  t.is(s(scalarEnum(Direction), Direction.LEFT), '02');
  t.is(s(scalarEnum(Direction), Direction.RIGHT), '03');
  t.is(d(scalarEnum(Direction), '00'), Direction.UP);
  t.is(d(scalarEnum(Direction), '01'), Direction.DOWN);
  t.is(d(scalarEnum(Direction), '02'), Direction.LEFT);
  t.is(d(scalarEnum(Direction), '03'), Direction.RIGHT);
  t.is(sd(scalarEnum(Direction), Direction.UP), Direction.UP);
  t.is(sd(scalarEnum(Direction), Direction.DOWN), Direction.DOWN);
  t.is(sd(scalarEnum(Direction), Direction.LEFT), Direction.LEFT);
  t.is(sd(scalarEnum(Direction), Direction.RIGHT), Direction.RIGHT);
  t.is(sd(scalarEnum(Direction), Direction.UP), 'Up' as Direction);
  t.is(sd(scalarEnum(Direction), Direction.DOWN), 'Down' as Direction);
  t.is(sd(scalarEnum(Direction), Direction.LEFT), 'Left' as Direction);
  t.is(sd(scalarEnum(Direction), Direction.RIGHT), 'Right' as Direction);
  t.is(s(scalarEnum(Direction), Direction.RIGHT), '03');
  t.is(s(scalarEnum(Direction), 'Right' as Direction), '03');
  t.is(s(scalarEnum(Direction), 'RIGHT' as Direction), '03');
  t.is(s(scalarEnum(Direction), 3 as unknown as Direction), '03');

  // Invalid examples.
  t.throws(() => s(scalarEnum(Feedback), 'Missing'), {
    message: (m: string) =>
      m.includes(
        'Invalid enum variant. Got "Missing", expected one of [BAD, GOOD, 0, 1]'
      ),
  });
  t.throws(() => s(scalarEnum(Direction), 'Diagonal' as any), {
    message: (m: string) =>
      m.includes(
        'Invalid enum variant. Got "Diagonal", expected one of [Up, Down, Left, Right]'
      ),
  });
});

test('it can serialize data enums', (t) => {
  const serializer = new BeetSerializer();
  const { dataEnum, struct, tuple, array } = serializer;
  const { string, u8, u32, u16, u64, unit, bool } = serializer;
  type WebEvent =
    | { __kind: 'PageLoad' } // Empty variant.
    | { __kind: 'Click'; x: number; y: number } // Struct variant.
    | { __kind: 'KeyPress'; fields: [string] } // Tuple variant.
    | { __kind: 'PageUnload' }; // Empty variant (using empty struct).
  const webEvent: DataEnumToSerializerTuple<WebEvent, WebEvent> = [
    ['PageLoad', unit],
    [
      'Click',
      struct<{ x: number; y: number }>([
        ['x', u8],
        ['y', u8],
      ]),
    ],
    ['KeyPress', struct<{ fields: [string] }>([['fields', tuple([string()])]])],
    ['PageUnload', struct<{}>([])],
  ];

  // Description matches the vec definition.
  t.is(
    dataEnum(webEvent).description,
    'dataEnum(' +
      'PageLoad: unit, ' +
      'Click: struct(x: u8, y: u8), ' +
      'KeyPress: struct(fields: tuple(string(u32, utf8))), ' +
      'PageUnload: struct()' +
      ')'
  );

  // Description can be overridden.
  t.is(
    dataEnum(webEvent, undefined, 'my data enum').description,
    'my data enum'
  );

  // Empty variants.
  const pageLoad: WebEvent = { __kind: 'PageLoad' };
  const pageUnload: WebEvent = { __kind: 'PageUnload' };
  t.is(s(dataEnum(webEvent), pageLoad), '00');
  t.deepEqual(sd(dataEnum(webEvent), pageLoad), pageLoad);
  t.deepEqual(sd(dataEnum(webEvent), pageUnload), pageUnload);
  t.deepEqual(d(dataEnum(webEvent), '00'), pageLoad);
  t.deepEqual(d(dataEnum(webEvent), 'ff00', 1), pageLoad);
  t.is(doffset(dataEnum(webEvent), '00'), 1);
  t.is(doffset(dataEnum(webEvent), 'ff00', 1), 2);

  // Struct variants.
  const click = (x: number, y: number): WebEvent => ({ __kind: 'Click', x, y });
  t.is(s(dataEnum(webEvent), click(0, 0)), '010000');
  t.is(s(dataEnum(webEvent), click(1, 2)), '010102');
  t.deepEqual(sd(dataEnum(webEvent), click(1, 2)), click(1, 2));
  t.deepEqual(d(dataEnum(webEvent), '010003'), click(0, 3));
  t.deepEqual(d(dataEnum(webEvent), 'ff010003', 1), click(0, 3));
  t.is(doffset(dataEnum(webEvent), '010003'), 3);
  t.is(doffset(dataEnum(webEvent), 'ff010003', 1), 4);

  // Tuple variants.
  const press = (k: string): WebEvent => ({ __kind: 'KeyPress', fields: [k] });
  t.is(s(dataEnum(webEvent), press('')), '0200000000');
  t.is(s(dataEnum(webEvent), press('1')), '020100000031');
  t.is(s(dataEnum(webEvent), press('enter')), '0205000000656e746572');
  t.deepEqual(sd(dataEnum(webEvent), press('')), press(''));
  t.deepEqual(sd(dataEnum(webEvent), press('1')), press('1'));
  t.deepEqual(sd(dataEnum(webEvent), press('語')), press('語'));
  t.deepEqual(sd(dataEnum(webEvent), press('enter')), press('enter'));
  t.deepEqual(d(dataEnum(webEvent), '020100000032'), press('2'));
  t.deepEqual(d(dataEnum(webEvent), 'ff020100000032', 1), press('2'));
  t.is(doffset(dataEnum(webEvent), '020100000032'), 6);
  t.is(doffset(dataEnum(webEvent), 'ff020100000032', 1), 7);

  // Invalid examples.
  t.throws(() => s(dataEnum(webEvent), { __kind: 'Missing' } as any), {
    message: (m: string) =>
      m.includes(
        'Invalid data enum variant. Got "Missing", ' +
          'expected one of [PageLoad, Click, KeyPress, PageUnload]'
      ),
  });
  t.throws(() => d(dataEnum(webEvent), '04'), {
    message: (m: string) =>
      m.includes(
        'Data enum index "4" is out of range. Index should be between 0 and 3.'
      ),
  });

  // Example with different From and To types.
  type FromType = { __kind: 'A' } | { __kind: 'B'; value: number | bigint };
  type ToType = { __kind: 'A' } | { __kind: 'B'; value: bigint };
  const dataEnumU64 = dataEnum<FromType, ToType>([
    ['A', unit],
    [
      'B',
      struct<{ value: bigint | number }, { value: bigint }>([['value', u64]]),
    ],
  ]);
  t.deepEqual(s(dataEnumU64, { __kind: 'B', value: 2 }), '010200000000000000');
  t.deepEqual(d(dataEnumU64, '010200000000000000'), { __kind: 'B', value: 2n });

  // Fixed Sizes are null if the variants are not all the same size.
  t.is(dataEnum(webEvent).fixedSize, null);
  t.is(dataEnumU64.fixedSize, null);

  // Max Sizes are null if at least one variant does not have a max size.
  t.is(dataEnum(webEvent).maxSize, null);
  t.is(dataEnumU64.maxSize, 9);

  // Sizes are fixed if all variants are the same size.
  type SameSizeVariants =
    | { __kind: 'A'; value: number }
    | { __kind: 'B'; x: number; y: number }
    | { __kind: 'C'; items: Array<boolean> };
  const dataEnumSameSizeVariants: DataEnumToSerializerTuple<
    SameSizeVariants,
    SameSizeVariants
  > = [
    ['A', struct<any>([['value', u16]])],
    [
      'B',
      struct<any>([
        ['x', u8],
        ['y', u8],
      ]),
    ],
    ['C', struct<any>([['items', array(bool(), 2)]])],
  ];
  t.is(dataEnum(dataEnumSameSizeVariants).fixedSize, 1 + 2);
  t.is(dataEnum(dataEnumSameSizeVariants).maxSize, 1 + 2);

  // Custom prefix serializer with fixed size.
  t.is(dataEnum(dataEnumSameSizeVariants, u32).fixedSize, 4 + 2);
  t.is(
    s(dataEnum(dataEnumSameSizeVariants, u32), { __kind: 'A', value: 42 }),
    '000000002a00'
  );
  t.deepEqual(d(dataEnum(dataEnumSameSizeVariants, u32), '000000002a00'), {
    __kind: 'A',
    value: 42,
  });
});

test('it can serialize fixed', (t) => {
  const { fixed, string, u8, u32, u64, bytes } = new BeetSerializer();

  // Description matches the fixed definition.
  t.is(fixed(12, u64).description, 'fixed(12, u64)');

  // Description can be overridden.
  t.is(fixed(12, u64, 'my fixed').description, 'my fixed');

  // Fixed and max sizes.
  t.is(fixed(12, u64).fixedSize, 12);
  t.is(fixed(12, u64).maxSize, 12);
  t.is(fixed(42, bytes).fixedSize, 42);
  t.is(fixed(42, bytes).maxSize, 42);

  // Buffer size === fixed size.
  t.is(s(fixed(8, u64), 42), '2a00000000000000');
  t.is(d(fixed(8, u64), '2a00000000000000'), 42n);
  t.is(doffset(fixed(8, u64), '2a00000000000000'), 8);
  t.is(sd(fixed(8, u64), 42n), 42n);
  t.is(s(fixed(5, utf8), 'Hello'), '48656c6c6f');
  t.is(d(fixed(5, utf8), '48656c6c6f'), 'Hello');
  t.is(doffset(fixed(5, utf8), '48656c6c6f'), 5);
  t.is(sd(fixed(5, utf8), 'Hello'), 'Hello');

  // Buffer size > fixed size => truncated.
  t.is(s(fixed(4, u64), 42), '2a000000');
  t.is(d(fixed(4, u64), '2a000000'), 42n);
  t.is(doffset(fixed(4, u64), '2a000000'), 4);
  t.is(sd(fixed(4, u64), 42n), 42n);
  t.is(s(fixed(5, string(u8)), 'Hello'), '0548656c6c');
  t.is(d(fixed(5, string(u8)), '0548656c6c'), 'Hell');
  t.is(doffset(fixed(5, string(u8)), '0548656c6c'), 5);
  t.is(sd(fixed(5, string(u8)), 'Hello'), 'Hell');

  // Buffer size < fixed size => padded.
  t.is(s(fixed(8, u32), 42), '2a00000000000000');
  t.is(d(fixed(8, u32), '2a00000000000000'), 42);
  t.is(doffset(fixed(8, u32), '2a00000000000000'), 8);
  t.is(sd(fixed(8, u32), 42), 42);
  t.is(s(fixed(8, utf8), 'Hello'), '48656c6c6f000000');
  t.is(d(fixed(8, utf8), '48656c6c6f000000'), 'Hello');
  t.is(doffset(fixed(8, utf8), '48656c6c6f000000'), 8);
  t.is(sd(fixed(8, utf8), 'Hello'), 'Hello');
});

test('it can handle empty buffers', (t) => {
  const { u8, unit } = new BeetSerializer();
  const tolerant = new BeetSerializer();
  const intolerant = new BeetSerializer({ tolerateEmptyBuffers: false });
  const e: ThrowsExpectation = { instanceOf: DeserializingEmptyBufferError };
  const fixedError = (expectedBytes: number) => ({
    message: (m: string) =>
      m.includes(`Serializer [fixed] expected ${expectedBytes} bytes, got 0.`),
  });
  const empty = (serializer: Serializer<any, any>) =>
    serializer.deserialize(new Uint8Array())[0];

  // Tuple.
  t.throws(() => empty(tolerant.tuple([u8])), e);
  t.throws(() => empty(intolerant.tuple([u8])), e);
  t.deepEqual(empty(tolerant.tuple([])), []);
  t.deepEqual(empty(intolerant.tuple([])), []);

  // Vec.
  t.deepEqual(empty(tolerant.vec(u8)), []);
  t.throws(() => empty(intolerant.vec(u8)), e);

  // Array.
  t.throws(() => empty(tolerant.array(u8, 5)), e);
  t.throws(() => empty(intolerant.array(u8, 5)), e);
  t.deepEqual(empty(tolerant.array(u8, 0)), []);
  t.deepEqual(empty(intolerant.array(u8, 0)), []);

  // Map.
  t.deepEqual(empty(tolerant.map(u8, u8)), new Map());
  t.throws(() => empty(intolerant.map(u8, u8)), e);

  // Set.
  t.deepEqual(empty(tolerant.set(u8)), new Set());
  t.throws(() => empty(intolerant.set(u8)), e);

  // Options.
  t.deepEqual(empty(tolerant.option(u8)), none());
  t.deepEqual(empty(tolerant.fixedOption(u8)), none());
  t.deepEqual(empty(tolerant.nullable(u8)), null);
  t.deepEqual(empty(tolerant.fixedNullable(u8)), null);
  t.throws(() => empty(intolerant.option(u8)), e);
  t.throws(() => empty(intolerant.fixedOption(u8)), e);
  t.throws(() => empty(intolerant.nullable(u8)), e);
  t.throws(() => empty(intolerant.fixedNullable(u8)), e);

  // Struct.
  t.throws(() => empty(tolerant.struct([['age', u8]])), e);
  t.throws(() => empty(intolerant.struct([['age', u8]])), e);
  t.deepEqual(empty(tolerant.struct([])), {});
  t.deepEqual(empty(intolerant.struct([])), {});

  // Enum.
  enum DummyEnum {}
  t.throws(() => empty(tolerant.enum(DummyEnum)), e);
  t.throws(() => empty(intolerant.enum(DummyEnum)), e);

  // DataEnum.
  type DummyDataEnum = { __kind: 'foo' };
  t.throws(() => empty(tolerant.dataEnum<DummyDataEnum>([['foo', unit]])), e);
  t.throws(() => empty(intolerant.dataEnum<DummyDataEnum>([['foo', unit]])), e);

  // Fixed.
  t.throws(() => empty(tolerant.fixed(42, u8)), fixedError(42));
  t.throws(() => empty(intolerant.fixed(42, u8)), fixedError(42));

  // Strings.
  t.throws(() => empty(tolerant.string()), e);
  t.throws(() => empty(intolerant.string()), e);
  t.throws(() => empty(tolerant.fixedString(5)), fixedError(5));
  t.throws(() => empty(intolerant.fixedString(5)), fixedError(5));
  t.is(empty(tolerant.fixedString(0)), '');
  t.is(empty(intolerant.fixedString(0)), '');

  // Bool.
  t.throws(() => empty(tolerant.bool()), e);
  t.throws(() => empty(intolerant.bool()), e);

  // Unit.
  t.is(empty(tolerant.unit), undefined);
  t.is(empty(intolerant.unit), undefined);

  // Numbers.
  t.throws(() => empty(tolerant.u8), e);
  t.throws(() => empty(tolerant.u64), e);
  t.throws(() => empty(intolerant.u8), e);
  t.throws(() => empty(intolerant.u64), e);

  // PublicKey.
  t.throws(() => empty(tolerant.publicKey), e);
  t.throws(() => empty(intolerant.publicKey), e);

  // Bytes.
  t.deepEqual(empty(tolerant.bytes), new Uint8Array());
  t.deepEqual(empty(intolerant.bytes), new Uint8Array());
});

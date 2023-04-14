import test from 'ava';
import { createDataViewSerializer } from '../src';
import { s, d } from './_helpers';

test('(de)serialization', (t) => {
  const { struct, u8, u64, string } = createDataViewSerializer();

  // Empty struct.
  s(t, struct([]), {}, '');
  d(t, struct([]), '', {}, 0);

  // Person struct.
  const person = struct([
    ['name', string()],
    ['age', u8()],
  ]);
  const alice = { name: 'Alice', age: 32 };
  s(t, person, alice, '05000000416c69636520');
  d(t, person, '05000000416c69636520', alice, 10);
  d(t, person, ['ffff05000000416c69636520', 2], alice, 12);
  const bob = { name: 'Bob', age: 28, dob: '1995-06-01' };
  s(t, person, bob, '03000000426f621c');
  d(t, person, '03000000426f621c', { name: 'Bob', age: 28 }, 8);

  // Different From and To types.
  const structU64 = struct<{ value: number | bigint }, { value: bigint }>([
    ['value', u64()],
  ]);
  s(t, structU64, { value: 2 }, '0200000000000000');
  d(t, structU64, '0200000000000000', { value: 2n });
});

test('description', (t) => {
  const { struct, u8, string } = createDataViewSerializer();
  t.is(struct([['age', u8()]]).description, 'struct(age: u8)');
  t.is(
    struct([
      ['name', string()],
      ['age', u8()],
    ]).description,
    'struct(name: string(utf8; u32(le)), age: u8)'
  );
  t.is(
    struct([['age', u8()]], { description: 'my struct' }).description,
    'my struct'
  );
});

test('sizes', (t) => {
  const { struct, option, u8, u64, string } = createDataViewSerializer();
  t.is(struct([]).fixedSize, 0);
  t.is(struct([]).maxSize, 0);
  t.is(struct([['age', u8()]]).fixedSize, 1);
  t.is(struct([['age', u8()]]).maxSize, 1);
  t.is(struct([['age', option(u8())]]).fixedSize, null);
  t.is(struct([['age', option(u8())]]).maxSize, 2);

  const person = struct([
    ['name', string()],
    ['age', u8()],
  ]);
  t.is(person.fixedSize, null);
  t.is(person.maxSize, null);

  const fixedPerson = struct([
    ['age', u8()],
    ['balance', u64()],
  ]);
  t.is(fixedPerson.fixedSize, 9);
  t.is(fixedPerson.maxSize, 9);
});

import test from 'ava';
import { none, Nullable, some, unwrapOptionRecursively } from '../src';

test('it can unwrap options recursively', (t) => {
  // Some.
  t.is(unwrapOptionRecursively(some(null)), null);
  t.is(unwrapOptionRecursively(some(42)), <number | null>42);
  t.is(unwrapOptionRecursively(some('hello')), <string | null>'hello');

  // None.
  t.is(unwrapOptionRecursively(none()), <unknown | null>null);
  t.is(unwrapOptionRecursively(none<number>()), <number | null>null);
  t.is(unwrapOptionRecursively(none<string>()), <string | null>null);

  // Nested Some and None.
  t.is(unwrapOptionRecursively(some(some(some(false)))), <boolean | null>false);
  t.is(unwrapOptionRecursively(some(some(none<42>()))), <42 | null>null);

  // Scalars.
  t.is(unwrapOptionRecursively(1), 1);
  t.is(unwrapOptionRecursively('hello'), 'hello');
  t.is(unwrapOptionRecursively(true), true);
  t.is(unwrapOptionRecursively(false), false);
  t.is(unwrapOptionRecursively(null), null);
  t.is(unwrapOptionRecursively(undefined), undefined);

  // TypedArrays.
  t.deepEqual(
    unwrapOptionRecursively(new Uint8Array([1, 2, 3])),
    new Uint8Array([1, 2, 3])
  );

  // Functions.
  const fn = () => 42;
  t.is(unwrapOptionRecursively(fn), fn);

  // Objects.
  t.deepEqual(unwrapOptionRecursively({ foo: 'hello' }), { foo: 'hello' });
  t.deepEqual(unwrapOptionRecursively({ foo: [1, true, '3'] }), {
    foo: [1, true, '3'],
  });
  t.deepEqual(unwrapOptionRecursively({ foo: none<string>() }), { foo: null });
  t.deepEqual(unwrapOptionRecursively({ foo: some(none<string>()) }), {
    foo: null,
  });
  t.deepEqual(
    unwrapOptionRecursively(some({ foo: some('bar'), baz: none<number>() })),
    <Nullable<{ foo: Nullable<string>; baz: Nullable<number> }>>{
      foo: 'bar',
      baz: null,
    }
  );

  // Arrays.
  t.deepEqual(unwrapOptionRecursively([1, true, '3']), [1, true, '3']);
  t.deepEqual(
    unwrapOptionRecursively([some('a'), none<boolean>(), some(some(3)), 'b']),
    ['a', null, 3, 'b']
  );
  t.deepEqual(
    unwrapOptionRecursively([
      some('a'),
      none<boolean>(),
      some(some(3)),
      'b',
    ] as const),
    <[string | null, boolean | null, number | null, string]>['a', null, 3, 'b']
  );

  // Combination.
  const person = {
    name: 'Roo',
    age: 42,
    gender: none<string>(),
    interests: [
      { name: 'Programming', category: some('IT') },
      { name: 'Modular Synths', category: some('Music') },
      { name: 'Popping bubble wrap', category: none<string>() },
    ],
    address: {
      street: '11215 104 Ave NW',
      city: 'Edmonton',
      zipcode: 'T5K 2S1',
      region: some('Alberta'),
      country: 'Canada',
      phone: none<string>(),
    },
  };
  const unwrappedPerson = unwrapOptionRecursively(person);
  type ExpectedUnwrappedPerson = {
    name: string;
    age: number;
    gender: string | null;
    interests: Array<{ name: string; category: string | null }>;
    address: {
      street: string;
      city: string;
      zipcode: string;
      region: string | null;
      country: string;
      phone: string | null;
    };
  };
  t.deepEqual(unwrappedPerson, <ExpectedUnwrappedPerson>{
    name: 'Roo',
    age: 42,
    gender: null,
    interests: [
      { name: 'Programming', category: 'IT' },
      { name: 'Modular Synths', category: 'Music' },
      { name: 'Popping bubble wrap', category: null },
    ],
    address: {
      street: '11215 104 Ave NW',
      city: 'Edmonton',
      zipcode: 'T5K 2S1',
      region: 'Alberta',
      country: 'Canada',
      phone: null,
    },
  });
});

test('it can unwrap options recursively whilst using a custom fallback', (t) => {
  const fallback = () => 42 as const;

  // Some.
  t.is(unwrapOptionRecursively(some(null), fallback), null);
  t.is(unwrapOptionRecursively(some(100), fallback), <number | 42>100);
  t.is(unwrapOptionRecursively(some('hello'), fallback), <string | 42>'hello');

  // None.
  t.is(unwrapOptionRecursively(none(), fallback), <unknown | 42>42);
  t.is(unwrapOptionRecursively(none<number>(), fallback), <number | 42>42);
  t.is(unwrapOptionRecursively(none<string>(), fallback), <string | 42>42);

  // Nested Some and None.
  t.is(
    unwrapOptionRecursively(some(some(some(false))), fallback),
    <boolean | 42>false
  );
  t.is(
    unwrapOptionRecursively(some(some(none<100>())), fallback),
    <100 | 42>42
  );

  // Combination.
  const person = {
    name: 'Roo',
    age: 42,
    gender: none<string>(),
    interests: [
      { name: 'Programming', category: some('IT') },
      { name: 'Modular Synths', category: some('Music') },
      { name: 'Popping bubble wrap', category: none<string>() },
    ],
    address: {
      street: '11215 104 Ave NW',
      city: 'Edmonton',
      zipcode: 'T5K 2S1',
      region: some('Alberta'),
      country: 'Canada',
      phone: none<string>(),
    },
  };
  const unwrappedPerson = unwrapOptionRecursively(person, fallback);
  type ExpectedUnwrappedPerson = {
    name: string;
    age: number;
    gender: string | 42;
    interests: Array<{ name: string; category: string | 42 }>;
    address: {
      street: string;
      city: string;
      zipcode: string;
      region: string | 42;
      country: string;
      phone: string | 42;
    };
  };
  t.deepEqual(unwrappedPerson, <ExpectedUnwrappedPerson>{
    name: 'Roo',
    age: 42,
    gender: 42,
    interests: [
      { name: 'Programming', category: 'IT' },
      { name: 'Modular Synths', category: 'Music' },
      { name: 'Popping bubble wrap', category: 42 },
    ],
    address: {
      street: '11215 104 Ave NW',
      city: 'Edmonton',
      zipcode: 'T5K 2S1',
      region: 'Alberta',
      country: 'Canada',
      phone: 42,
    },
  });
});

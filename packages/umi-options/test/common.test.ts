import test from 'ava';
import {
  isNone,
  isOption,
  isSome,
  none,
  Nullable,
  Nullish,
  Option,
  OptionOrNullable,
  OptionOrNullish,
  some,
} from '../src';

test('it can create Some and None options', (t) => {
  const optionA: Option<number> = some(42);
  t.deepEqual(optionA, { __option: 'Some', value: 42 });

  const optionB: Option<null> = some(null);
  t.deepEqual(optionB, { __option: 'Some', value: null });

  const optionC: Option<unknown> = none();
  t.deepEqual(optionC, { __option: 'None' });

  const optionD: Option<string> = none<string>();
  t.deepEqual(optionD, { __option: 'None' });
});

test('it can check if an option is Some or None', (t) => {
  const optionA = some(42);
  t.true(isSome(optionA));
  t.false(isNone(optionA));

  const optionB = none<number>();
  t.false(isSome(optionB));
  t.true(isNone(optionB));
});

test('it can check if a value is an Option', (t) => {
  t.true(isOption(some(42)));
  t.true(isOption(none()));
  t.false(isOption(null));
  t.false(isOption(undefined));
  t.false(isOption(42));
  t.false(isOption('hello'));
  t.false(isOption({ value: 42 }));
  t.false(isOption({ __option: 'Some' })); // missing value
  t.false(isOption({ __option: 'Invalid', value: 42 }));
});

test('Nullable type accepts value or null', (t) => {
  const a: Nullable<number> = 42;
  const b: Nullable<number> = null;

  t.is(a, 42);
  t.is(b, null);
});

test('Nullish type accepts value, null, or undefined', (t) => {
  const a: Nullish<number> = 42;
  const b: Nullish<number> = null;
  const c: Nullish<number> = undefined;

  t.is(a, 42);
  t.is(b, null);
  t.is(c, undefined);
});

test('OptionOrNullable accepts Option, value, or null', (t) => {
  const a: OptionOrNullable<number> = some(42);
  const b: OptionOrNullable<number> = none();
  const c: OptionOrNullable<number> = 42;
  const d: OptionOrNullable<number> = null;

  t.true(isOption(a));
  t.true(isOption(b));
  t.is(c, 42);
  t.is(d, null);
});

test('OptionOrNullish accepts Option, value, null, or undefined', (t) => {
  const a: OptionOrNullish<number> = some(42);
  const b: OptionOrNullish<number> = none();
  const c: OptionOrNullish<number> = 42;
  const d: OptionOrNullish<number> = null;
  const e: OptionOrNullish<number> = undefined;

  t.true(isOption(a));
  t.true(isOption(b));
  t.is(c, 42);
  t.is(d, null);
  t.is(e, undefined);
});

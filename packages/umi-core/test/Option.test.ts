import test from 'ava';
import {
  isNone,
  isSome,
  none,
  Option,
  some,
  unwrapSome,
  unwrapSomeOrElse,
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

test('it can unwrap an Option as a Nullable', (t) => {
  t.is(unwrapSome(some(42)), 42);
  t.is(unwrapSome(some(null)), null);
  t.is(unwrapSome(some('hello')), 'hello');
  t.is(unwrapSome(none()), null);
  t.is(unwrapSome(none<number>()), null);
  t.is(unwrapSome(none<string>()), null);
});

test('it can unwrap an Option using a fallback callback', (t) => {
  const fallbackA = () => 42;
  t.is(unwrapSomeOrElse(some(1), fallbackA), 1);
  t.is(unwrapSomeOrElse(some('A'), fallbackA), 'A');
  t.is(unwrapSomeOrElse(none(), fallbackA), 42);

  const fallbackB = () => {
    throw new Error('Fallback Error');
  };
  t.is(unwrapSomeOrElse(some(1), fallbackB), 1);
  t.is(unwrapSomeOrElse(some('A'), fallbackB), 'A');
  t.throws(() => unwrapSomeOrElse(none(), fallbackB), {
    message: 'Fallback Error',
  });
});

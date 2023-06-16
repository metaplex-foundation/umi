import test from 'ava';
import { isNone, isSome, none, Option, some, unwrapOption } from '../src';

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
  t.is(unwrapOption(some(42)), 42);
  t.is(unwrapOption(some(null)), null);
  t.is(unwrapOption(some('hello')), 'hello');
  t.is(unwrapOption(none()), null);
  t.is(unwrapOption(none<number>()), null);
  t.is(unwrapOption(none<string>()), null);
});

test('it can unwrap an Option using a fallback callback', (t) => {
  const fallbackA = () => 42;
  t.is(unwrapOption(some(1), fallbackA), 1);
  t.is(unwrapOption(some('A'), fallbackA), 'A');
  t.is(unwrapOption(none(), fallbackA), 42);

  const fallbackB = () => {
    throw new Error('Fallback Error');
  };
  t.is(unwrapOption(some(1), fallbackB), 1);
  t.is(unwrapOption(some('A'), fallbackB), 'A');
  t.throws(() => unwrapOption(none(), fallbackB), {
    message: 'Fallback Error',
  });
});

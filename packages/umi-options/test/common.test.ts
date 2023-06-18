import test from 'ava';
import { isNone, isSome, none, Option, some } from '../src';

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

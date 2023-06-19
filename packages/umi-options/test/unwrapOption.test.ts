import test from 'ava';
import { none, some, unwrapOption, wrapNullable } from '../src';

test('it can unwrap an Option as a Nullable', (t) => {
  t.is(unwrapOption(some(42)), 42);
  t.is(unwrapOption(some(null)), null);
  t.is(unwrapOption(some('hello')), 'hello');
  t.is(unwrapOption(none()), null);
  t.is(unwrapOption(none<number>()), null);
  t.is(unwrapOption(none<string>()), null);
});

test('it can unwrap an Option using a fallback callback', (t) => {
  const fallbackA = () => 42 as const;
  t.is(unwrapOption(some(1), fallbackA), <number | 42>1);
  t.is(unwrapOption(some('A'), fallbackA), <string | 42>'A');
  t.is(unwrapOption(none(), fallbackA), <unknown | 42>42);

  const fallbackB = () => {
    throw new Error('Fallback Error');
  };
  t.is(unwrapOption(some(1), fallbackB), 1);
  t.is(unwrapOption(some('A'), fallbackB), 'A');
  t.throws(() => unwrapOption(none(), fallbackB), {
    message: 'Fallback Error',
  });
});

test('it can wrap a Nullable as an Option', (t) => {
  t.deepEqual(wrapNullable(42), some(42));
  t.deepEqual(wrapNullable('hello'), some('hello'));
  t.deepEqual(wrapNullable(false), some(false));
  t.deepEqual(wrapNullable(undefined), some(undefined));
  t.deepEqual(wrapNullable<string>(null), none<string>());
  t.deepEqual(wrapNullable<number>(null), none<number>());
});

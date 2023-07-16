import test from 'ava';
import { dateTime, formatDateTime } from '../src';

test('it can create date times from strings', (t) => {
  t.is(dateTime('2023-07-16T00:00:00.000Z'), 1689465600n);
});

test('it can format date times as strings', (t) => {
  t.true(formatDateTime(1689465600n).includes('Jul 16, 2023'));
});

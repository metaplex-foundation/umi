import test from 'ava';
import { mockStorage } from '../src';

test('example test', async (t) => {
  t.is(typeof mockStorage, 'function');
});

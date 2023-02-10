import test from 'ava';
import { testPlugins } from '../src';

test('example test', async (t) => {
  t.is(typeof testPlugins, 'function');
});

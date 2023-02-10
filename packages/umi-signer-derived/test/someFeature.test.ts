import test from 'ava';
import { createDerivedSigner } from '../src';

test('example test', async (t) => {
  t.is(typeof createDerivedSigner, 'function');
});

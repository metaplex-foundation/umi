import test from 'ava';
import { createSignerFromWalletAdapter } from '../src';

test('example test', async (t) => {
  t.is(typeof createSignerFromWalletAdapter, 'function');
});

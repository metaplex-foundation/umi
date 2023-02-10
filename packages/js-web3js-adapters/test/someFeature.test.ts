import test from 'ava';
import { fromWeb3JsPublicKey } from '../src';

test('example test', async (t) => {
  t.is(typeof fromWeb3JsPublicKey, 'function');
});

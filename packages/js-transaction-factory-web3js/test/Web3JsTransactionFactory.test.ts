import test from 'ava';
import { web3JsTransactionFactory } from '../src';

test('example test', async (t) => {
  t.is(typeof web3JsTransactionFactory, 'function');
});

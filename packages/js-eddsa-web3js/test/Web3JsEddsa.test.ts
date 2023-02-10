import test from 'ava';
import { web3JsEddsa } from '../src';

test('example test', async (t) => {
  t.is(typeof web3JsEddsa, 'function');
});

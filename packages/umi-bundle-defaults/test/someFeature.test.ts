import test from 'ava';
import { createUmi, defaultPlugins } from '../src';

// TODO: Add a quick test for each interface to make sure it's all working.
test('example test', async (t) => {
  t.is(typeof defaultPlugins, 'function');
});

test('it passes the default transaction version to the transaction factory', (t) => {
  const endpoint = 'http://localhost:8899';
  const withDefault = createUmi(endpoint, { defaultTransactionVersion: 1 });
  t.is(withDefault.transactions.getDefaultVersion(), 1);
  t.is(createUmi(endpoint).transactions.getDefaultVersion(), 0);
});

import test from 'ava';
import { transactionBuilder } from '../src';
import { createUmi, transferSol } from './_setup';

test('it can get the size of the transaction to build', (t) => {
  const umi = createUmi();
  const builder = transactionBuilder(umi).add(transferSol(umi));
  t.is(builder.getTransactionSize(), 305);
});

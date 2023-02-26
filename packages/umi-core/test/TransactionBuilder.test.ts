import test from 'ava';
import {
  createNullContext,
  transactionBuilder,
  TransactionBuilder,
} from '../src';

test('it ...', (t) => {
  const builder = getTestTransactionBuilder();
  console.log(builder);
  t.pass();
});

function getTestTransactionBuilder(): TransactionBuilder {
  return transactionBuilder(createNullContext());
}

import test from 'ava';
import {
  getTransactionSizeLimit,
  TRANSACTION_SIZE_LIMIT,
  TRANSACTION_V1_SIZE_LIMIT,
} from '../src';

test('it gives the size limit of each transaction version', (t) => {
  t.is(getTransactionSizeLimit('legacy'), TRANSACTION_SIZE_LIMIT);
  t.is(getTransactionSizeLimit(0), TRANSACTION_SIZE_LIMIT);
  t.is(getTransactionSizeLimit(1), TRANSACTION_V1_SIZE_LIMIT);
});

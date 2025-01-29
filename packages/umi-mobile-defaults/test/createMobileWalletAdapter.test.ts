import test from 'ava';
import { createUmiMobile } from '../src';

test('it can create a Umi instance with mobile defaults', (t) => {
  const umi = createUmiMobile('https://api.mainnet-beta.solana.com');
  t.true(!!umi.rpc, 'rpc is defined');
  t.true(!!umi.eddsa, 'eddsa is defined');
  t.true(!!umi.programs, 'programs is defined');
  t.true(!!umi.transactions, 'transactions is defined');
});

test('it can create a Umi instance with RPC options', (t) => {
  const umi = createUmiMobile('https://api.mainnet-beta.solana.com', {
    getAccountsChunkSize: 100,
  });
  t.true(!!umi.rpc, 'rpc is defined');
  t.true(!!umi.eddsa, 'eddsa is defined');
  t.true(!!umi.programs, 'programs is defined');
  t.true(!!umi.transactions, 'transactions is defined');
});

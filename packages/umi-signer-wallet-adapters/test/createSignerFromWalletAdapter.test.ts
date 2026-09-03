import {
  publicKey,
  Transaction,
  TRANSACTION_CONFIG_MAX,
} from '@metaplex-foundation/umi';
import {
  compileTransactionMessage,
  toWeb3JsPublicKey,
  Web3JsTransactionVersionError,
} from '@metaplex-foundation/umi-web3js-adapters';
import test from 'ava';
import { createSignerFromWalletAdapter, WalletAdapter } from '../src';

const PAYER = publicKey('AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9');
const BLOCKHASH = '11111111111111111111111111111111';

const createTransaction = (version: 0 | 1): Transaction => ({
  message: compileTransactionMessage(
    version === 1
      ? {
          version,
          payer: PAYER,
          instructions: [],
          blockhash: BLOCKHASH,
          transactionConfig: TRANSACTION_CONFIG_MAX,
        }
      : { version, payer: PAYER, instructions: [], blockhash: BLOCKHASH }
  ),
  serializedMessage: new Uint8Array(),
  signatures: [new Uint8Array(64)],
});

const createFakeWalletAdapter = () => {
  const calls: string[] = [];
  const walletAdapter: WalletAdapter = {
    publicKey: toWeb3JsPublicKey(PAYER),
    signTransaction: async (transaction) => {
      calls.push('signTransaction');
      return transaction;
    },
    signAllTransactions: async (transactions) => {
      calls.push('signAllTransactions');
      return transactions;
    },
  };
  return { walletAdapter, calls };
};

test('it rejects V1 transactions before involving the wallet', async (t) => {
  const { walletAdapter, calls } = createFakeWalletAdapter();
  const signer = createSignerFromWalletAdapter(walletAdapter);
  const expected = {
    instanceOf: Web3JsTransactionVersionError,
    message: /V1 transactions.*wallet stack that supports V1.*useV0\(\)/,
  };

  await t.throwsAsync(signer.signTransaction(createTransaction(1)), {
    ...expected,
    message: /^signTransaction /,
  });
  await t.throwsAsync(
    signer.signAllTransactions([createTransaction(0), createTransaction(1)]),
    { ...expected, message: /^signAllTransactions / }
  );
  t.deepEqual(calls, []);
});

test('it still hands V0 transactions to the wallet', async (t) => {
  const { walletAdapter, calls } = createFakeWalletAdapter();
  const signer = createSignerFromWalletAdapter(walletAdapter);

  const signed = await signer.signTransaction(createTransaction(0));
  const allSigned = await signer.signAllTransactions([createTransaction(0)]);

  t.is(signed.message.version, 0);
  t.is(allSigned.length, 1);
  t.deepEqual(calls, ['signTransaction', 'signAllTransactions']);
});

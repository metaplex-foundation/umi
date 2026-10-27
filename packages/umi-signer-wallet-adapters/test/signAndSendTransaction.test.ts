/* eslint-disable import/no-extraneous-dependencies */
import {
  base58,
  createBaseUmi,
  generateSigner,
  PublicKey,
  Umi,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import {
  Connection as Web3JsConnection,
  PublicKey as Web3JsPublicKey,
} from '@solana/web3.js';
import test from 'ava';
import {
  createSignerFromWalletAdapter,
  walletAdapterIdentity,
  walletAdapterPayer,
  WalletAdapter,
} from '../src';

const createUmi = (): Umi =>
  createBaseUmi().use(web3JsEddsa()).use(web3JsTransactionFactory());

const createTransaction = (umi: Umi, payer: PublicKey) =>
  umi.transactions.create({
    version: 1,
    payer,
    blockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
    instructions: [],
    transactionConfig: {},
  });

test('it signs and sends a transaction through a wallet that supports sendTransaction', async (t) => {
  const umi = createUmi();
  const payer = generateSigner(umi);
  const transaction = createTransaction(umi, payer.publicKey);

  const connection = new Web3JsConnection('https://example.com');
  const expectedSignature =
    '4gJ3ZUiCzqhKtwrCVzT4RLPPz39aSAKY7g5N6q4Bxq3mSNQjRW1cFrjCbFDbAtbWkajvw6oW7hSHR8QzXWtSKGuo';

  const wallet: WalletAdapter = {
    publicKey: new Web3JsPublicKey(payer.publicKey),
    sendTransaction: async (_tx, conn) => {
      t.is(conn, connection);
      return expectedSignature;
    },
  };
  const signer = createSignerFromWalletAdapter(wallet, connection);

  const signature = await signer.signAndSendTransaction?.(transaction);

  t.deepEqual(signature, base58.serialize(expectedSignature));
});

test('walletAdapterIdentity and walletAdapterPayer forward the connection through to signAndSendTransaction', async (t) => {
  // Regression coverage: the test above only calls createSignerFromWalletAdapter
  // directly, so it wouldn't catch either plugin dropping its connection argument.
  const connection = new Web3JsConnection('https://example.com');
  const expectedSignature =
    '4gJ3ZUiCzqhKtwrCVzT4RLPPz39aSAKY7g5N6q4Bxq3mSNQjRW1cFrjCbFDbAtbWkajvw6oW7hSHR8QzXWtSKGuo';

  const identityUmi = createUmi();
  const identityPayer = generateSigner(identityUmi);
  const identityWallet: WalletAdapter = {
    publicKey: new Web3JsPublicKey(identityPayer.publicKey),
    sendTransaction: async () => expectedSignature,
  };
  identityUmi.use(walletAdapterIdentity(identityWallet, true, connection));
  const identityTransaction = createTransaction(
    identityUmi,
    identityUmi.identity.publicKey
  );
  t.deepEqual(
    await identityUmi.identity.signAndSendTransaction?.(identityTransaction),
    base58.serialize(expectedSignature)
  );

  const payerUmi = createUmi();
  const payerSigner = generateSigner(payerUmi);
  const payerWallet: WalletAdapter = {
    publicKey: new Web3JsPublicKey(payerSigner.publicKey),
    sendTransaction: async () => expectedSignature,
  };
  payerUmi.use(walletAdapterPayer(payerWallet, connection));
  const payerTransaction = createTransaction(
    payerUmi,
    payerUmi.payer.publicKey
  );
  t.deepEqual(
    await payerUmi.payer.signAndSendTransaction?.(payerTransaction),
    base58.serialize(expectedSignature)
  );
});

test('it throws when the wallet does not support sendTransaction', async (t) => {
  const umi = createUmi();
  const payer = generateSigner(umi);
  const transaction = createTransaction(umi, payer.publicKey);
  const connection = new Web3JsConnection('https://example.com');

  const wallet: WalletAdapter = {
    publicKey: new Web3JsPublicKey(payer.publicKey),
  };
  const signer = createSignerFromWalletAdapter(wallet, connection);

  await t.throwsAsync(() => signer.signAndSendTransaction!(transaction), {
    name: 'OperationNotSupportedByWalletAdapterError',
  });
});

test('it throws when no connection was provided, even if the wallet supports sendTransaction', async (t) => {
  const umi = createUmi();
  const payer = generateSigner(umi);
  const transaction = createTransaction(umi, payer.publicKey);

  const wallet: WalletAdapter = {
    publicKey: new Web3JsPublicKey(payer.publicKey),
    sendTransaction: async () => 'unused',
  };
  const signer = createSignerFromWalletAdapter(wallet); // No connection passed.

  await t.throwsAsync(() => signer.signAndSendTransaction!(transaction), {
    name: 'OperationNotSupportedByWalletAdapterError',
  });
});

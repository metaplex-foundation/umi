/* eslint-disable import/no-extraneous-dependencies */
import {
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
import { createSignerFromWalletAdapter, WalletAdapter } from '../src';

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

  t.truthy(signature);
  t.is(signature?.length, 64); // A valid ed25519 signature is 64 bytes.
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

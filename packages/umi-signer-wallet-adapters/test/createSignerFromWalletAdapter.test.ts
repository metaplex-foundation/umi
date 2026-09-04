/* eslint-disable import/no-extraneous-dependencies */
import {
  createBaseUmi,
  generateSigner,
  KeypairSigner,
  lamports,
  publicKey,
  Umi,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { VersionedTransaction } from '@solana/web3.js';
import test from 'ava';
import { createSignerFromWalletAdapter, WalletAdapter } from '../src';

/**
 * A wallet that, like wallet-standard wallets, receives serialized
 * transactions, signs them and returns the signed bytes.
 */
const createFakeWallet = (umi: Umi, keypair: KeypairSigner): WalletAdapter => {
  const sign = async (transaction: VersionedTransaction) => {
    const received = umi.transactions.deserialize(transaction.serialize());
    const signed = await keypair.signTransaction(received);
    return VersionedTransaction.deserialize(umi.transactions.serialize(signed));
  };
  const signAll = (transactions: VersionedTransaction[]) =>
    Promise.all(transactions.map(sign));
  return {
    publicKey: toWeb3JsPublicKey(keypair.publicKey),
    signTransaction: sign,
    signAllTransactions: signAll,
  } as unknown as WalletAdapter;
};

test('it can sign V1 transactions through a wallet adapter', async (t) => {
  const umi = createBaseUmi()
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory());
  const keypair = generateSigner(umi);
  const signer = createSignerFromWalletAdapter(createFakeWallet(umi, keypair));
  const transaction = umi.transactions.create({
    version: 1,
    payer: keypair.publicKey,
    instructions: [
      {
        programId: publicKey('11111111111111111111111111111111'),
        keys: [
          { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: generateSigner(umi).publicKey,
            isSigner: false,
            isWritable: true,
          },
        ],
        data: new Uint8Array([2, 0, 0, 0, 64, 66, 15, 0, 0, 0, 0, 0]),
      },
    ],
    blockhash: '11111111111111111111111111111111',
    transactionConfig: {
      computeUnitLimit: 30_000,
      priorityFee: lamports(5_000),
    },
  });

  const signed = await signer.signTransaction(transaction);
  t.deepEqual(signed.message, transaction.message);
  t.deepEqual(signed.serializedMessage, transaction.serializedMessage);
  t.true(
    umi.eddsa.verify(
      signed.serializedMessage,
      signed.signatures[0],
      keypair.publicKey
    )
  );

  const [signedAgain] = await signer.signAllTransactions([transaction]);
  t.deepEqual(signedAgain, signed);
});

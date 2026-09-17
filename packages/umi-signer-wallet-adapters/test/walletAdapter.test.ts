/* eslint-disable import/no-extraneous-dependencies */
import {
  createBaseUmi,
  generateSigner,
  lamports,
  publicKey,
  signTransaction,
  Umi,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import {
  PublicKey as Web3JsPublicKey,
  Transaction as Web3JsLegacyTransaction,
  VersionedTransaction as Web3JsTransaction,
} from '@solana/web3.js';
import test from 'ava';
import { createSignerFromWalletAdapter, WalletAdapter } from '../src';

const createUmi = (): Umi =>
  createBaseUmi().use(web3JsEddsa()).use(web3JsTransactionFactory());

test('it signs V1 transactions through a wallet that only knows stock web3.js', async (t) => {
  // Given a V1 transaction that needs two signatures.
  const umi = createUmi();
  const payer = generateSigner(umi);
  const other = generateSigner(umi);
  const transaction = umi.transactions.create({
    version: 1,
    payer: payer.publicKey,
    blockhash: 'GeyAFFRY3WGpmam2hbgrKw4rbU2RKzfVLm5QLSeZwTZE',
    instructions: [
      {
        programId: publicKey('11111111111111111111111111111111'),
        keys: [
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: other.publicKey, isSigner: true, isWritable: false },
        ],
        data: new Uint8Array([1, 2, 3]),
      },
    ],
    transactionConfig: {
      priorityFee: lamports(5_000),
      computeUnitLimit: 200_000,
      loadedAccountsDataSizeLimit: 1024 * 1024,
      heapSize: 65_536,
    },
  });
  t.is(transaction.message.header.numRequiredSignatures, 2);

  // And a wallet that re-parses the bytes with stock web3.js, signs the
  // message bytes and hands back a plain VersionedTransaction.
  const signWithWallet = async <
    T extends Web3JsLegacyTransaction | Web3JsTransaction
  >(
    web3JsTransaction: T
  ): Promise<T> => {
    const bytes = web3JsTransaction.serialize();
    const parsed = Web3JsTransaction.deserialize(bytes);
    const messageBytes = bytes.slice(
      0,
      bytes.length - 64 * parsed.signatures.length
    );
    parsed.addSignature(
      new Web3JsPublicKey(payer.publicKey),
      umi.eddsa.sign(messageBytes, payer)
    );
    return parsed as unknown as T;
  };
  const wallet: WalletAdapter = {
    publicKey: new Web3JsPublicKey(payer.publicKey),
    signTransaction: signWithWallet,
    signAllTransactions: (transactions) =>
      Promise.all(transactions.map(signWithWallet)),
  };
  const signer = createSignerFromWalletAdapter(wallet);

  // When the wallet signs and Umi adds the second signature.
  const walletSigned = await signer.signTransaction(transaction);
  const fullySigned = await signTransaction(walletSigned, [other]);

  // Then the message survived the wallet untouched and both signatures verify.
  t.deepEqual(walletSigned.message, transaction.message);
  t.deepEqual(walletSigned.serializedMessage, transaction.serializedMessage);
  t.true(
    umi.eddsa.verify(
      fullySigned.serializedMessage,
      fullySigned.signatures[0],
      payer.publicKey
    )
  );
  t.true(
    umi.eddsa.verify(
      fullySigned.serializedMessage,
      fullySigned.signatures[1],
      other.publicKey
    )
  );

  // And the result is a V1 transaction that round-trips through the factory.
  const serialized = umi.transactions.serialize(fullySigned);
  t.is(serialized[0], 0x81);
  t.deepEqual(umi.transactions.deserialize(serialized), fullySigned);
  t.deepEqual(await signer.signAllTransactions([transaction]), [walletSigned]);
});

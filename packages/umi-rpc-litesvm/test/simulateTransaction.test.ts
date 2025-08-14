import { createNullContext, sol } from '@metaplex-foundation/umi';
import {
  fromWeb3JsLegacyTransaction,
  fromWeb3JsPublicKey,
  fromWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  Keypair,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import test from 'ava';
import { LiteSVM } from 'litesvm';
import { createLiteSvmRpc } from '../src';

// transaction simulation needs a greater ava timeout than the default 10s due to airdrop.

test('simulates a legacy transaction', async (t) => {
  // Given an RPC client.

  const context = createNullContext();
  const rpc = createLiteSvmRpc(context, new LiteSVM());

  const key1 = Keypair.generate();
  const key2 = Keypair.generate();

  // tried with confirmed but wasn't registering the airdrop in time before trasnfer simulation

  await rpc.airdrop(fromWeb3JsPublicKey(key1.publicKey), sol(1), {
    commitment: 'finalized',
  });

  const blockhash = await rpc.getLatestBlockhash();

  const transferIx = SystemProgram.transfer({
    fromPubkey: key1.publicKey,
    toPubkey: key2.publicKey,
    lamports: 500000000,
  });

  const legacyTransaction = new Transaction().add(transferIx);
  legacyTransaction.recentBlockhash = blockhash.blockhash;
  legacyTransaction.sign(key1);

  const result = await rpc.simulateTransaction(
    fromWeb3JsLegacyTransaction(legacyTransaction),
    {
      accounts: [
        fromWeb3JsPublicKey(key1.publicKey),
        fromWeb3JsPublicKey(key2.publicKey),
      ],
    }
  );

  // check results of TransactionSimulation

  t.assert(result.err === null, 'simulation should not have errored');
  t.assert(
    result.logs && result.logs.length > 0,
    'simulation should have logs'
  );
  t.assert(
    result.unitsConsumed && result.unitsConsumed > 0,
    'simulation should have consumed units'
  );
});

test('simulates a V0 transaction', async (t) => {
  // Given an RPC client.

  const context = createNullContext();
  const rpc = createLiteSvmRpc(context, new LiteSVM());

  const key1 = Keypair.generate();
  const key2 = Keypair.generate();

  // tried with confirmed but wasn't registering the airdrop in time before trasnfer simulation

  await rpc.airdrop(fromWeb3JsPublicKey(key1.publicKey), sol(1), {
    commitment: 'finalized',
  });

  const blockhash = await rpc.getLatestBlockhash();

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: key1.publicKey,
      toPubkey: key2.publicKey,
      lamports: 500000000,
    }),
  ];

  const messageV0 = new TransactionMessage({
    payerKey: key1.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0, [key1.secretKey]);
  const result = await rpc.simulateTransaction(
    fromWeb3JsTransaction(versionedTx),
    {
      accounts: [
        fromWeb3JsPublicKey(key1.publicKey),
        fromWeb3JsPublicKey(key2.publicKey),
      ],
    }
  );

  // check results of TransactionSimulation

  t.assert(result.err === null, 'simulation should not have errored');
  t.assert(
    result.logs && result.logs.length > 0,
    'simulation should have logs'
  );
  t.assert(
    result.unitsConsumed && result.unitsConsumed > 0,
    'simulation should have consumed units'
  );
});

test('simulates a transaction and fails with Insufficient rent err', async (t) => {
  // Given an RPC client.

  const context = createNullContext();
  const rpc = createLiteSvmRpc(context, new LiteSVM());

  const key1 = Keypair.generate();
  const key2 = Keypair.generate();

  // tried with confirmed but wasn't registering the airdrop in time before trasnfer simulation

  await rpc.airdrop(fromWeb3JsPublicKey(key1.publicKey), sol(1), {
    commitment: 'finalized',
  });

  const blockhash = await rpc.getLatestBlockhash();

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: key1.publicKey,
      toPubkey: key2.publicKey,
      lamports: 1000,
    }),
  ];

  const messageV0 = new TransactionMessage({
    payerKey: key1.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0, [key1.secretKey]);
  const result = await rpc.simulateTransaction(
    fromWeb3JsTransaction(versionedTx),
    {
      accounts: [
        fromWeb3JsPublicKey(key1.publicKey),
        fromWeb3JsPublicKey(key2.publicKey),
      ],
    }
  );

  // check results of TransactionSimulation

  t.like(result.err, { InsufficientFundsForRent: { account_index: 1 } });
});

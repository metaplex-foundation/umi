import {
  BlockhashWithExpiryBlockHeight,
  Context,
  createNullContext,
  RpcInterface,
  SdkError,
  sol,
  Transaction,
  TransactionSignature,
} from '@metaplex-foundation/umi';
import { createWeb3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import {
  fromWeb3JsLegacyTransaction,
  fromWeb3JsPublicKey,
  fromWeb3JsTransaction,
} from '@metaplex-foundation/umi-web3js-adapters';
import {
  Keypair,
  SystemProgram,
  Transaction as Web3JsLegacyTransaction,
  TransactionMessage as Web3JsTransactionMessage,
  VersionedTransaction as Web3JsTransaction,
} from '@solana/web3.js';
import test, { ExecutionContext } from 'ava';
import { createWeb3JsRpc } from '../src';

const LOCALHOST = 'http://127.0.0.1:8899';

const createContext = (): Context => ({
  ...createNullContext(),
  transactions: createWeb3JsTransactionFactory(),
});

const fundedKeypair = async (rpc: RpcInterface): Promise<Keypair> => {
  const keypair = Keypair.generate();
  await rpc.airdrop(fromWeb3JsPublicKey(keypair.publicKey), sol(1), {
    commitment: 'finalized',
  });
  return keypair;
};

const sendAndConfirm = async (
  rpc: RpcInterface,
  transaction: Transaction,
  blockhash: BlockhashWithExpiryBlockHeight
): Promise<TransactionSignature> => {
  const signature = await rpc.sendTransaction(transaction);
  await rpc.confirmTransaction(signature, {
    strategy: { type: 'blockhash', ...blockhash },
    commitment: 'confirmed',
  });
  return signature;
};

const assertReadBackAsSent = async (
  t: ExecutionContext,
  rpc: RpcInterface,
  sent: Transaction,
  blockhash: BlockhashWithExpiryBlockHeight
) => {
  const signature = await sendAndConfirm(rpc, sent, blockhash);
  const fetched = await rpc.getTransaction(signature, {
    commitment: 'confirmed',
  });
  if (!fetched) {
    t.fail('the confirmed transaction could not be fetched');
    return;
  }

  t.deepEqual(fetched.message, sent.message);
  t.deepEqual(
    fetched.serializedMessage,
    new Uint8Array(sent.serializedMessage)
  );
  t.deepEqual(fetched.signatures, sent.signatures);
  t.is(fetched.response.version, sent.message.version);
  t.is(typeof fetched.response.slot, 'bigint');
  t.is(fetched.meta.err, null);
  t.true(fetched.meta.fee.basisPoints > 0n);
  t.is(fetched.meta.preBalances.length, sent.message.accounts.length);
  t.is(fetched.meta.postBalances.length, sent.message.accounts.length);
  t.true(fetched.meta.logs.length > 0);
  t.is(typeof fetched.meta.computeUnitsConsumed, 'bigint');
  t.deepEqual(fetched.meta.loadedAddresses, { writable: [], readonly: [] });
};

test('it reads back a legacy transaction as it was sent', async (t) => {
  const rpc = createWeb3JsRpc(createContext(), LOCALHOST);
  const payer = await fundedKeypair(rpc);
  const blockhash = await rpc.getLatestBlockhash();

  const web3JsTransaction = new Web3JsLegacyTransaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 500_000_000,
    })
  );
  web3JsTransaction.recentBlockhash = blockhash.blockhash;
  web3JsTransaction.sign(payer);

  await assertReadBackAsSent(
    t,
    rpc,
    fromWeb3JsLegacyTransaction(web3JsTransaction),
    blockhash
  );
});

test('it reads back a V0 transaction as it was sent', async (t) => {
  const rpc = createWeb3JsRpc(createContext(), LOCALHOST);
  const payer = await fundedKeypair(rpc);
  const blockhash = await rpc.getLatestBlockhash();

  const message = new Web3JsTransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: 500_000_000,
      }),
    ],
  }).compileToV0Message();
  const web3JsTransaction = new Web3JsTransaction(message);
  web3JsTransaction.sign([payer]);

  await assertReadBackAsSent(
    t,
    rpc,
    fromWeb3JsTransaction(web3JsTransaction),
    blockhash
  );
});

test('it returns null for unknown transactions', async (t) => {
  const rpc = createWeb3JsRpc(createContext(), LOCALHOST);
  t.is(await rpc.getTransaction(new Uint8Array(64)), null);
});

test('it rejects the processed commitment', async (t) => {
  const rpc = createWeb3JsRpc(createContext(), LOCALHOST);
  await t.throwsAsync(
    () => rpc.getTransaction(new Uint8Array(64), { commitment: 'processed' }),
    { instanceOf: SdkError, message: /confirmed or finalized/ }
  );
});

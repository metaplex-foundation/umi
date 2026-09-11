import test from 'ava';
import {
  createBaseUmi,
  generateSigner,
  sol,
  Umi,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { dataViewSerializer } from '@metaplex-foundation/umi-serializer-data-view';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import { generatedSignerIdentity } from '@metaplex-foundation/umi';
import { quasarSvmRpc } from '../src';

function createTestUmi(): Umi {
  return createBaseUmi()
    .use(dataViewSerializer())
    .use(defaultProgramRepository())
    .use(fetchHttp())
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory())
    .use(mockStorage())
    .use(quasarSvmRpc())
    .use(generatedSignerIdentity());
}

test('it returns the quasar-svm endpoint', (t) => {
  const umi = createTestUmi();
  t.is(umi.rpc.getEndpoint(), 'quasar-svm://in-process');
});

test('it returns custom cluster', (t) => {
  const umi = createTestUmi();
  t.is(umi.rpc.getCluster(), 'custom');
});

test('it can airdrop SOL', async (t) => {
  const umi = createTestUmi();
  const signer = generateSigner(umi);

  await umi.rpc.airdrop(signer.publicKey, sol(10));
  const balance = await umi.rpc.getBalance(signer.publicKey);
  t.is(balance.basisPoints, sol(10).basisPoints);
});

test('it can airdrop SOL multiple times', async (t) => {
  const umi = createTestUmi();
  const signer = generateSigner(umi);

  await umi.rpc.airdrop(signer.publicKey, sol(5));
  await umi.rpc.airdrop(signer.publicKey, sol(3));
  const balance = await umi.rpc.getBalance(signer.publicKey);
  t.is(balance.basisPoints, sol(8).basisPoints);
});

test('it returns zero balance for unknown accounts', async (t) => {
  const umi = createTestUmi();
  const signer = generateSigner(umi);

  const balance = await umi.rpc.getBalance(signer.publicKey);
  t.is(balance.basisPoints, BigInt(0));
});

test('it can check if account exists', async (t) => {
  const umi = createTestUmi();
  const signer = generateSigner(umi);

  t.false(await umi.rpc.accountExists(signer.publicKey));
  await umi.rpc.airdrop(signer.publicKey, sol(1));
  t.true(await umi.rpc.accountExists(signer.publicKey));
});

test('it can get account info after airdrop', async (t) => {
  const umi = createTestUmi();
  const signer = generateSigner(umi);

  await umi.rpc.airdrop(signer.publicKey, sol(1));
  const account = await umi.rpc.getAccount(signer.publicKey);
  t.true(account.exists);
  if (account.exists) {
    t.is(account.lamports.basisPoints, sol(1).basisPoints);
    t.false(account.executable);
  }
});

test('it returns non-existing account', async (t) => {
  const umi = createTestUmi();
  const signer = generateSigner(umi);

  const account = await umi.rpc.getAccount(signer.publicKey);
  t.false(account.exists);
});

test('it can get multiple accounts', async (t) => {
  const umi = createTestUmi();
  const s1 = generateSigner(umi);
  const s2 = generateSigner(umi);
  const s3 = generateSigner(umi);

  await umi.rpc.airdrop(s1.publicKey, sol(1));
  await umi.rpc.airdrop(s2.publicKey, sol(2));

  const accounts = await umi.rpc.getAccounts([
    s1.publicKey,
    s2.publicKey,
    s3.publicKey,
  ]);

  t.is(accounts.length, 3);
  t.true(accounts[0].exists);
  t.true(accounts[1].exists);
  t.false(accounts[2].exists);
});

test('it provides a slot', async (t) => {
  const umi = createTestUmi();
  const slot = await umi.rpc.getSlot();
  t.true(slot >= 1);
});

test('it provides a latest blockhash', async (t) => {
  const umi = createTestUmi();
  const blockhash = await umi.rpc.getLatestBlockhash();
  t.truthy(blockhash.blockhash);
  t.true(blockhash.lastValidBlockHeight > 0);
});

test('it provides different blockhashes on each call', async (t) => {
  const umi = createTestUmi();
  const bh1 = await umi.rpc.getLatestBlockhash();
  const bh2 = await umi.rpc.getLatestBlockhash();
  t.not(bh1.blockhash, bh2.blockhash);
});

test('it provides a genesis hash', async (t) => {
  const umi = createTestUmi();
  const hash = await umi.rpc.getGenesisHash();
  t.truthy(hash);
});

test('it calculates rent', async (t) => {
  const umi = createTestUmi();
  const rent = await umi.rpc.getRent(100);
  t.true(rent.basisPoints > BigInt(0));
});

test('it provides a block time', async (t) => {
  const umi = createTestUmi();
  const blockTime = await umi.rpc.getBlockTime(1);
  t.truthy(blockTime);
});

test('it returns null for unknown transactions', async (t) => {
  const umi = createTestUmi();
  const fakeSignature = new Uint8Array(64);
  const tx = await umi.rpc.getTransaction(fakeSignature);
  t.is(tx, null);
});

test('it returns null for unknown signature statuses', async (t) => {
  const umi = createTestUmi();
  const fakeSignature = new Uint8Array(64);
  const statuses = await umi.rpc.getSignatureStatuses([fakeSignature]);
  t.is(statuses.length, 1);
  t.is(statuses[0], null);
});

test('it throws on arbitrary RPC calls', async (t) => {
  const umi = createTestUmi();
  await t.throwsAsync(() => umi.rpc.call('getVersion'), {
    message: /does not support arbitrary RPC calls/,
  });
});

test('it confirms transactions immediately', async (t) => {
  const umi = createTestUmi();
  const fakeSignature = new Uint8Array(64);
  const blockhash = await umi.rpc.getLatestBlockhash();
  const result = await umi.rpc.confirmTransaction(fakeSignature, {
    strategy: {
      type: 'blockhash',
      ...blockhash,
    },
  });
  t.truthy(result.context);
  t.is(result.value.err, null);
});

import {
  assertAccountExists,
  createBaseUmi,
  generatedSignerIdentity,
  generateSigner,
  MaybeRpcAccount,
  PublicKey,
  publicKey,
  RpcUnsubscribe,
  Signer,
  sol,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import {
  fromWeb3JsInstruction,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import { SystemProgram } from '@solana/web3.js';
import test from 'ava';
import { web3JsRpc } from '../src';

const LOCALHOST = 'http://127.0.0.1:8899';
// The clock sysvar is updated every slot, so it is a reliable source of changes.
const CLOCK_SYSVAR = publicKey('SysvarC1ock11111111111111111111111111111111');
const SYSVAR_OWNER = publicKey('Sysvar1111111111111111111111111111111111111');

const createUmi = () =>
  createBaseUmi()
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory())
    .use(web3JsRpc(LOCALHOST, 'confirmed'))
    .use(generatedSignerIdentity());

const transferSol = (from: Signer, to: PublicKey, lamports: number) =>
  transactionBuilder().add({
    instruction: fromWeb3JsInstruction(
      SystemProgram.transfer({
        fromPubkey: toWeb3JsPublicKey(from.publicKey),
        toPubkey: toWeb3JsPublicKey(to),
        lamports,
      })
    ),
    signers: [from],
    bytesCreatedOnChain: 0,
  });

test('it notifies with the updated account when it changes', async (t) => {
  // Given a Umi instance.
  const umi = createUmi();

  // When we subscribe to an account that changes every slot.
  const { account, context } = await new Promise<{
    account: MaybeRpcAccount;
    context: { slot: number };
  }>((resolve) => {
    umi.rpc.onAccountChange(CLOCK_SYSVAR, (account, context) => {
      resolve({ account, context });
    });
  });

  // Then we receive the updated account as an existing Umi RPC account.
  assertAccountExists(account);
  t.is(account.publicKey, CLOCK_SYSVAR);
  t.is(account.owner, SYSVAR_OWNER);
  t.is(account.data.length, 40);
  t.true(account.data instanceof Uint8Array);
  t.true(context.slot > 0);
});

test('it notifies with a non-existing account once it is closed', async (t) => {
  // Given a funded identity and a subscription to a fresh account.
  const umi = createUmi();
  await umi.rpc.airdrop(umi.identity.publicKey, sol(1));
  const target = generateSigner(umi);
  const notifications: MaybeRpcAccount[] = [];
  const unsubscribe = umi.rpc.onAccountChange(target.publicKey, (account) => {
    notifications.push(account);
  });

  // When we fund the account and then drain it entirely, which closes it.
  await transferSol(umi.identity, target.publicKey, 500000000).sendAndConfirm(
    umi
  );
  await transferSol(target, umi.identity.publicKey, 500000000).sendAndConfirm(
    umi
  );
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
  await unsubscribe();

  // Then we were notified of the funded account followed by the closed one.
  t.is(notifications.length, 2);
  t.true(notifications[0].exists);
  t.false(notifications[1].exists);
  t.is(notifications[1].publicKey, target.publicKey);
});

test('it stops notifying once unsubscribed', async (t) => {
  // Given a Umi instance subscribed to an account that changes every slot.
  const umi = createUmi();
  let notifications = 0;
  let unsubscribe: RpcUnsubscribe = async () => {};
  await new Promise<void>((resolve) => {
    unsubscribe = umi.rpc.onAccountChange(CLOCK_SYSVAR, () => {
      notifications += 1;
      resolve();
    });
  });

  // When we unsubscribe.
  await unsubscribe();
  const countAfterUnsubscribe = notifications;

  // Then no further notifications arrive.
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
  t.is(notifications, countAfterUnsubscribe);
});

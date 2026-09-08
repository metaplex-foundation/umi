import {
  assertAccountExists,
  createNullContext,
  MaybeRpcAccount,
  publicKey,
  sol,
} from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import {
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import test from 'ava';
import { createWeb3JsRpc } from '../src';

const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
const LOCALHOST = 'http://127.0.0.1:8899';
// The clock sysvar is updated every slot, so it is a reliable source of changes.
const CLOCK_SYSVAR = publicKey('SysvarC1ock11111111111111111111111111111111');
const SYSVAR_OWNER = publicKey('Sysvar1111111111111111111111111111111111111');

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

test('it notifies with the updated account when it changes', async (t) => {
  // Given an RPC client.
  const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

  // When we subscribe to an account that changes every slot.
  const { account, context } = await new Promise<{
    account: MaybeRpcAccount;
    context: { slot: number };
  }>((resolve) => {
    rpc.onAccountChange(CLOCK_SYSVAR, (account, context) => {
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
  // Given a funded payer and a subscription to a fresh account.
  const rpc = createWeb3JsRpc(createNullContext(), LOCALHOST);
  const payer = Keypair.generate();
  const target = Keypair.generate();
  const targetPublicKey = fromWeb3JsPublicKey(target.publicKey);
  await rpc.airdrop(fromWeb3JsPublicKey(payer.publicKey), sol(1), {
    commitment: 'finalized',
  });
  const notifications: MaybeRpcAccount[] = [];
  const unsubscribe = rpc.onAccountChange(
    targetPublicKey,
    (account) => {
      notifications.push(account);
    },
    { commitment: 'confirmed' }
  );
  const transfer = (from: Keypair, to: Keypair, lamports: number) =>
    sendAndConfirmTransaction(
      rpc.connection,
      new Transaction({ feePayer: payer.publicKey }).add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports,
        })
      ),
      from === payer ? [payer] : [payer, from],
      { commitment: 'confirmed' }
    );

  // When we fund the account and then drain it entirely, which closes it.
  await transfer(payer, target, 500_000_000);
  await transfer(target, payer, 500_000_000);
  await sleep(2000);
  await unsubscribe();

  // Then we were notified of the funded account followed by the closed one.
  t.is(notifications.length, 2);
  t.true(notifications[0].exists);
  t.false(notifications[1].exists);
  t.is(notifications[1].publicKey, targetPublicKey);
});

test('it stops notifying once unsubscribed', async (t) => {
  // Given an RPC client subscribed to an account that changes every slot.
  const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);
  let notifications = 0;
  let unsubscribe: () => Promise<void> = async () => {};
  await new Promise<void>((resolve) => {
    unsubscribe = rpc.onAccountChange(CLOCK_SYSVAR, () => {
      notifications += 1;
      resolve();
    });
  });

  // When we unsubscribe.
  await unsubscribe();
  const countAfterUnsubscribe = notifications;

  // Then no further notifications arrive.
  await sleep(2000);
  t.is(notifications, countAfterUnsubscribe);
});

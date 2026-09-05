import {
  createNullContext,
  publicKey,
  RpcAccount,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsRpc } from '../src';

const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
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
    account: RpcAccount;
    context: { slot: number };
  }>((resolve) => {
    rpc.onAccountChange(CLOCK_SYSVAR, (account, context) => {
      resolve({ account, context });
    });
  });

  // Then we receive the updated account as a Umi RPC account.
  t.is(account.publicKey, CLOCK_SYSVAR);
  t.is(account.owner, SYSVAR_OWNER);
  t.is(account.data.length, 40);
  t.true(account.data instanceof Uint8Array);
  t.true(context.slot > 0);
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

import test from 'ava';
import {
  ACCOUNT_HEADER_SIZE,
  createNullContext,
  lamports,
} from '@metaplex-foundation/umi';
import { Connection as Web3JsConnection } from '@solana/web3.js';
import { createWeb3JsRpc } from '../src';

const LOCALHOST = 'http://127.0.0.1:8899';

test('it returns the rent-exemption for a given amount of bytes', async (t) => {
  // Given an RPC client.
  const rpc = createWeb3JsRpc(createNullContext(), LOCALHOST);

  // When we get the rent for a given amount of bytes.
  const rent = await rpc.getRent(42);

  // Then it matches the rent we get from Web3Js.
  const connection = new Web3JsConnection(LOCALHOST);
  const expectedRent = lamports(
    await connection.getMinimumBalanceForRentExemption(42)
  );
  t.deepEqual(rent, expectedRent);
});

test('it returns the rent-exemption for byte amounts that already include account headers', async (t) => {
  // Given an RPC client.
  const rpc = createWeb3JsRpc(createNullContext(), LOCALHOST);

  // When we get the rent for a given amount of bytes.
  const rent = await rpc.getRent(42 + ACCOUNT_HEADER_SIZE, {
    includesHeaderBytes: true,
  });

  // Then it matches the rent we get from Web3Js.
  const connection = new Web3JsConnection(LOCALHOST);
  const expectedRent = lamports(
    await connection.getMinimumBalanceForRentExemption(42)
  );
  t.deepEqual(rent, expectedRent);
});

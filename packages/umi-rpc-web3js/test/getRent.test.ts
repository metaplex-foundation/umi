import test from 'ava';

// These tests require a reachable RPC node (local validator or devnet).
// They are skipped unless UMI_RPC_NETWORK_TESTS is set, so offline runs
// and coverage stay green; CI sets the variable and runs them.
const testWithNetwork = process.env.UMI_RPC_NETWORK_TESTS ? test : test.skip;
import {
  ACCOUNT_HEADER_SIZE,
  createNullContext,
  lamports,
} from '@metaplex-foundation/umi';
import { Connection as Web3JsConnection } from '@solana/web3.js';
import { createWeb3JsRpc } from '../src';

const LOCALHOST = 'http://127.0.0.1:8899';

testWithNetwork('it returns the rent-exemption for a given amount of bytes', async (t) => {
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

testWithNetwork('it returns the rent-exemption for byte amounts that already include account headers', async (t) => {
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

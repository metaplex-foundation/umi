import { createNullContext } from '@metaplex-foundation/umi';
import test from 'ava';

// These tests require a reachable RPC node (local validator or devnet).
// They are skipped unless UMI_RPC_NETWORK_TESTS is set, so offline runs
// and coverage stay green; CI sets the variable and runs them.
const testWithNetwork = process.env.UMI_RPC_NETWORK_TESTS ? test : test.skip;
import { createWeb3JsRpc } from '../src';

testWithNetwork('fetches and returns a genesis hash', async (t) => {
  // Given an RPC client.
  const rpc = createWeb3JsRpc(
    createNullContext(),
    'https://api.devnet.solana.com'
  );

  // When we get the rent for a given amount of bytes.
  const hash = await rpc.getGenesisHash();

  // check hash is equal to string
  t.assert(typeof hash === 'string');
});

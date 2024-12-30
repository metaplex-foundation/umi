import { createNullContext } from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsRpc } from '../src';

const LOCALHOST = 'http://127.0.0.1:8899';

test('fetches and returns a genesis hash', async (t) => {
  // Given an RPC client.
  const rpc = createWeb3JsRpc(createNullContext(), LOCALHOST);

  // When we get the rent for a given amount of bytes.
  const hash = await rpc.getGenesisHash();

  // check hash is equal to string
  t.assert(typeof hash === 'string');
});

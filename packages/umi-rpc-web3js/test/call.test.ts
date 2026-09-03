import { createNullContext } from '@metaplex-foundation/umi';
import { PublicKey as Web3JsPublicKey } from '@solana/web3.js';
import test from 'ava';
import { createWeb3JsRpc, RpcError } from '../src';

const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
const LOCALHOST = 'http://127.0.0.1:8899';

type AccountInfoResponse = {
  value: { data: unknown; executable: boolean; owner: string };
};

test('it rejects JSON-RPC errors', async (t) => {
  const rpc = createWeb3JsRpc(createNullContext(), LOCALHOST);

  const promise = rpc.call('getTransaction', ['not-a-signature']);

  const error = await t.throwsAsync(promise, { instanceOf: RpcError });
  t.like(error, { name: 'RpcError', source: 'rpc', code: -32602 });
  t.false('logs' in (error ?? {}));
  t.regex(error?.message ?? '', /Source: RPC/);
});

test('it calls RPC methods with positional parameters', async (t) => {
  // Given an RPC client
  const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

  // When we call an RPC method with positional parameters
  const result = await rpc.call<string>('getHealth', []);

  // Then we get the expected result
  t.is(result, 'ok');
});

test('it calls RPC methods with positional parameters and commitment', async (t) => {
  // Given an RPC client
  const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

  // When we call an RPC method with positional parameters and a commitment
  const result = await rpc.call<number>('getBlockHeight', [], {
    commitment: 'finalized',
  });

  // Then the call succeeds and returns a result with expected structure
  t.truthy(result);
  t.true(result > 356940296);
});

test('it calls RPC methods with named parameters', async (t) => {
  // Given an RPC client
  const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);

  // When we call an RPC method with named parameters
  // Note: For Solana RPC, named parameters are handled correctly
  const result = await rpc.call<any, Record<string, any>>('getAsset', {
    id: 'jMpf59VX9rvweytJcQDe6biP8oJhDKZmibMaWihXrKd',
  });

  // Then the call succeeds
  t.truthy(result);
  t.true(typeof result === 'object');
  t.true(result.interface === 'V1_NFT');
});

test('it merges the commitment option into a trailing config object', async (t) => {
  const rpc = createWeb3JsRpc(createNullContext(), DEVNET_ENDPOINT);
  const address = '11111111111111111111111111111111';

  const inline = await rpc.call<AccountInfoResponse>('getAccountInfo', [
    address,
    { encoding: 'base64', commitment: 'confirmed' },
  ]);
  const merged = await rpc.call<AccountInfoResponse>(
    'getAccountInfo',
    [address, { encoding: 'base64' }],
    { commitment: 'confirmed' }
  );
  const appended = await rpc.call<AccountInfoResponse>(
    'getAccountInfo',
    [address],
    { commitment: 'confirmed' }
  );

  [inline, merged, appended].forEach((result) => {
    t.is(result.value.owner, 'NativeLoader1111111111111111111111111111111');
    t.true(result.value.executable);
  });
  t.deepEqual(merged.value.data, inline.value.data);
});

test('it does not merge call options into a trailing class instance', async (t) => {
  const rpc = createWeb3JsRpc(createNullContext(), LOCALHOST);
  const address = '11111111111111111111111111111111';

  const fromInstance = await rpc.call<AccountInfoResponse>(
    'getAccountInfo',
    [new Web3JsPublicKey(address)],
    { commitment: 'confirmed' }
  );
  const fromString = await rpc.call<AccountInfoResponse>(
    'getAccountInfo',
    [address, { encoding: 'base64' }],
    { commitment: 'confirmed' }
  );

  t.is(fromInstance.value.owner, 'NativeLoader1111111111111111111111111111111');
  t.is(fromString.value.owner, fromInstance.value.owner);
});

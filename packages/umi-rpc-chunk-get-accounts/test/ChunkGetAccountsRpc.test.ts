import {
  MaybeRpcAccount,
  PublicKey,
  RpcGetAccountsOptions,
  RpcInterface,
  createBaseUmi,
  createNullRpc,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { chunkGetAccountsRpc, createChunkGetAccountsRpc } from '../src';

/** Creates a fake — yet unique — public key from a given index. */
const publicKey = (index: number): PublicKey => `key-${index}` as PublicKey;

/** Creates an array of `length` unique fake public keys. */
const publicKeys = (length: number): PublicKey[] =>
  Array.from({ length }, (_, index) => publicKey(index));

/**
 * Creates a mock RPC that records the public key batches and options
 * received by `getAccounts` and returns one fake account per public key.
 */
const createRecordingRpc = (): {
  rpc: RpcInterface;
  batches: PublicKey[][];
  receivedOptions: (RpcGetAccountsOptions | undefined)[];
} => {
  const batches: PublicKey[][] = [];
  const receivedOptions: (RpcGetAccountsOptions | undefined)[] = [];
  const rpc: RpcInterface = {
    ...createNullRpc(),
    getAccounts: async (keys, options) => {
      batches.push([...keys]);
      receivedOptions.push(options);
      return keys.map(
        (key): MaybeRpcAccount => ({ exists: false, publicKey: key })
      );
    },
  };
  return { rpc, batches, receivedOptions };
};

test('it forwards small enough requests as a single call', async (t) => {
  // Given a chunked RPC with a chunk size of 10.
  const { rpc, batches } = createRecordingRpc();
  const chunkedRpc = createChunkGetAccountsRpc(rpc, 10);

  // When we fetch fewer accounts than the chunk size.
  const keys = publicKeys(9);
  const accounts = await chunkedRpc.getAccounts(keys);

  // Then the underlying RPC received a single call with all the keys.
  t.deepEqual(batches, [keys]);

  // And we got one account per key, in order.
  t.deepEqual(
    accounts.map((account) => account.publicKey),
    keys
  );
});

test('it uses a single call when the number of keys matches the chunk size exactly', async (t) => {
  // Given a chunked RPC with a chunk size of 10.
  const { rpc, batches } = createRecordingRpc();
  const chunkedRpc = createChunkGetAccountsRpc(rpc, 10);

  // When we fetch exactly 10 accounts.
  const keys = publicKeys(10);
  await chunkedRpc.getAccounts(keys);

  // Then the underlying RPC received a single call with all the keys.
  t.deepEqual(batches, [keys]);
});

test('it chunks requests that go over the chunk size', async (t) => {
  // Given a chunked RPC with a chunk size of 10.
  const { rpc, batches } = createRecordingRpc();
  const chunkedRpc = createChunkGetAccountsRpc(rpc, 10);

  // When we fetch 21 accounts — i.e. 2 * chunkSize + 1.
  const keys = publicKeys(21);
  const accounts = await chunkedRpc.getAccounts(keys);

  // Then the underlying RPC received 3 calls of sizes 10, 10 and 1.
  t.deepEqual(
    batches.map((batch) => batch.length),
    [10, 10, 1]
  );

  // And the batches cover all the keys in order.
  t.deepEqual(batches.flat(), keys);

  // And the results are concatenated in the same order as the keys.
  t.deepEqual(
    accounts.map((account) => account.publicKey),
    keys
  );
});

test('it defaults to a chunk size of 100', async (t) => {
  // Given a chunked RPC using the default chunk size.
  const { rpc, batches } = createRecordingRpc();
  const chunkedRpc = createChunkGetAccountsRpc(rpc);

  // When we fetch 250 accounts.
  await chunkedRpc.getAccounts(publicKeys(250));

  // Then the underlying RPC received 3 calls of sizes 100, 100 and 50.
  t.deepEqual(
    batches.map((batch) => batch.length),
    [100, 100, 50]
  );
});

test('it forwards the provided options to every underlying call', async (t) => {
  // Given a chunked RPC with a chunk size of 2.
  const { rpc, receivedOptions } = createRecordingRpc();
  const chunkedRpc = createChunkGetAccountsRpc(rpc, 2);

  // When we fetch 5 accounts — i.e. 3 chunks — using custom options.
  const options: RpcGetAccountsOptions = {
    commitment: 'finalized',
    dataSlice: { offset: 0, length: 8 },
  };
  await chunkedRpc.getAccounts(publicKeys(5), options);

  // Then every underlying call received these options.
  t.deepEqual(receivedOptions, [options, options, options]);
});

test('it keeps the other methods of the wrapped RPC', async (t) => {
  // Given an RPC whose getEndpoint method is known.
  const { rpc } = createRecordingRpc();

  // When we wrap it in a chunked RPC.
  const chunkedRpc = createChunkGetAccountsRpc(rpc, 10);

  // Then all other methods are kept as-is.
  t.is(chunkedRpc.getEndpoint, rpc.getEndpoint);
  t.is(chunkedRpc.getAccount, rpc.getAccount);
  t.is(chunkedRpc.getLatestBlockhash, rpc.getLatestBlockhash);

  // But getAccounts was replaced by the chunked implementation.
  t.not(chunkedRpc.getAccounts, rpc.getAccounts);
});

test('it can be installed as a plugin wrapping the current RPC', async (t) => {
  // Given a base Umi instance with a recording RPC installed.
  const { rpc, batches } = createRecordingRpc();
  const umi = createBaseUmi();
  umi.rpc = rpc;

  // When we install the plugin with a custom chunk size of 2.
  umi.use(chunkGetAccountsRpc(2));

  // And fetch 5 accounts.
  const keys = publicKeys(5);
  const accounts = await umi.rpc.getAccounts(keys);

  // Then the underlying RPC received 3 chunked calls.
  t.deepEqual(
    batches.map((batch) => batch.length),
    [2, 2, 1]
  );

  // And the accounts were concatenated in order.
  t.deepEqual(
    accounts.map((account) => account.publicKey),
    keys
  );
});

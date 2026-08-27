import {
  Context,
  createBaseUmi,
  createGenericFile,
  isKeypairSigner,
  lamports,
  publicKey,
  sol,
  TransactionWithMeta,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  assertSolBalanceChanges,
  getSolBalanceChanges,
  testPlugins,
} from '../src';

const PAYER = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
const RECEIVER = publicKey('So11111111111111111111111111111111111111112');

const createTransactionWithMeta = (
  preBalances: bigint[],
  postBalances: bigint[]
): TransactionWithMeta =>
  ({
    message: { accounts: [PAYER, RECEIVER] },
    meta: {
      preBalances: preBalances.map(lamports),
      postBalances: postBalances.map(lamports),
    },
  } as unknown as TransactionWithMeta);

test('the test plugins compose a fully offline-capable umi', async (t) => {
  const umi = createBaseUmi().use(testPlugins());

  // A generated keypair identity is installed.
  t.true(isKeypairSigner(umi.identity));
  t.is<string, string>(umi.payer.publicKey, umi.identity.publicKey);

  // The RPC points at the local validator endpoint by default.
  t.is(umi.rpc.getEndpoint(), 'http://127.0.0.1:8899');

  // Mock storage uploads and downloads without a network.
  const file = createGenericFile(new Uint8Array([1, 2, 3]), 'test.bin');
  const [uri] = await umi.uploader.upload([file]);
  const [downloaded] = await umi.downloader.download([uri]);
  t.deepEqual(downloaded.buffer, new Uint8Array([1, 2, 3]));

  // Eddsa and serializer are live.
  t.is(umi.eddsa.generateKeypair().secretKey.length, 64);
  t.deepEqual(umi.serializer.u8().serialize(7), new Uint8Array([7]));
});

test('it computes sol balance changes from transaction metadata', (t) => {
  const transaction = createTransactionWithMeta(
    [10_000n, 500n],
    [8_000n, 2_500n]
  );
  t.deepEqual(getSolBalanceChanges(transaction), {
    [PAYER]: lamports(-2_000n),
    [RECEIVER]: lamports(2_000n),
  });
});

test('it asserts aggregated balance changes across transactions', async (t) => {
  const rpc = {
    getTransaction: async () =>
      createTransactionWithMeta([1_000n, 0n], [400n, 600n]),
  } as unknown as Context['rpc'];

  await t.notThrowsAsync(() =>
    assertSolBalanceChanges({ rpc }, [new Uint8Array(64), new Uint8Array(64)], {
      [PAYER]: lamports(-1_200n),
      [RECEIVER]: lamports(1_200n),
    })
  );
});

test('it rejects mismatched balance changes', async (t) => {
  const rpc = {
    getTransaction: async () =>
      createTransactionWithMeta([1_000n, 0n], [400n, 600n]),
  } as unknown as Context['rpc'];

  await t.throwsAsync(
    () =>
      assertSolBalanceChanges({ rpc }, [new Uint8Array(64)], {
        [PAYER]: sol(-1),
      }),
    { message: /Balance change mismatch/ }
  );
});

test('exclusive mode rejects unexpected balance changes', async (t) => {
  const rpc = {
    getTransaction: async () =>
      createTransactionWithMeta([1_000n, 0n], [400n, 600n]),
  } as unknown as Context['rpc'];

  await t.throwsAsync(
    () =>
      assertSolBalanceChanges(
        { rpc },
        [new Uint8Array(64)],
        { [PAYER]: lamports(-600n) },
        true
      ),
    { message: /Unexpected balance change/ }
  );
});

test('it fails when a transaction cannot be found', async (t) => {
  const rpc = {
    getTransaction: async () => null,
  } as unknown as Context['rpc'];

  await t.throwsAsync(
    () => assertSolBalanceChanges({ rpc }, [new Uint8Array(64)], {}),
    { message: /Transaction not found/ }
  );
});

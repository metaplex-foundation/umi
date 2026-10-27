import { createNullContext, publicKey } from '@metaplex-foundation/umi';
import { Keypair, PublicKey as Web3JsPublicKey } from '@solana/web3.js';
import test from 'ava';
import {
  createWeb3JsRpc,
  GET_MULTIPLE_ACCOUNTS_LIMIT,
} from '../src';

const SYSTEM_PROGRAM = '11111111111111111111111111111111';

function makeAccountInfo(overrides: Partial<{
  lamports: number;
  owner: Web3JsPublicKey;
  data: Uint8Array;
  executable: boolean;
  rentEpoch: number;
}> = {}) {
  return {
    lamports: overrides.lamports ?? 1_000_000,
    owner: overrides.owner ?? new Web3JsPublicKey(SYSTEM_PROGRAM),
    data: overrides.data ?? new Uint8Array([1, 2, 3]),
    executable: overrides.executable ?? false,
    rentEpoch: overrides.rentEpoch ?? 0,
  };
}

test('getAccounts chunks requests over the getMultipleAccounts limit', async (t) => {
  const keys = Array.from({ length: GET_MULTIPLE_ACCOUNTS_LIMIT + 25 }, () =>
    publicKey(Keypair.generate().publicKey.toBase58())
  );

  const callSizes: number[] = [];
  const connection = {
    rpcEndpoint: 'http://127.0.0.1:8899',
    getMultipleAccountsInfo: async (web3Keys: Web3JsPublicKey[]) => {
      callSizes.push(web3Keys.length);
      return web3Keys.map(() => makeAccountInfo());
    },
  } as any;

  const rpc = createWeb3JsRpc(createNullContext(), connection);
  const accounts = await rpc.getAccounts(keys);

  t.is(accounts.length, keys.length);
  t.deepEqual(callSizes, [GET_MULTIPLE_ACCOUNTS_LIMIT, 25]);
  t.true(accounts.every((a) => a.exists));
});

test('getAccounts does not chunk requests within the limit', async (t) => {
  const keys = Array.from({ length: 10 }, () =>
    publicKey(Keypair.generate().publicKey.toBase58())
  );

  let calls = 0;
  const connection = {
    rpcEndpoint: 'http://127.0.0.1:8899',
    getMultipleAccountsInfo: async (web3Keys: Web3JsPublicKey[]) => {
      calls += 1;
      t.is(web3Keys.length, 10);
      return web3Keys.map(() => makeAccountInfo());
    },
  } as any;

  const rpc = createWeb3JsRpc(createNullContext(), connection);
  const accounts = await rpc.getAccounts(keys);

  t.is(calls, 1);
  t.is(accounts.length, 10);
});

test('getProgramAccounts falls back to getProgramAccountsV2 pagination on too-many-accounts errors', async (t) => {
  const programId = publicKey(Keypair.generate().publicKey.toBase58());
  const page1Key = publicKey(Keypair.generate().publicKey.toBase58());
  const page2Key = publicKey(Keypair.generate().publicKey.toBase58());

  const v2Calls: Array<{ paginationKey?: string }> = [];

  const connection = {
    rpcEndpoint: 'https://mainnet.helius-rpc.com',
    getProgramAccounts: async () => {
      throw new Error(
        'failed to get accounts owned by program: Too many accounts requested (5000001 pubkeys), Please use getProgramAccountsV2 with pagination to handle large datasets.'
      );
    },
    _rpcClient: {
      request: (
        method: string,
        params: any[],
        callback: (err: Error | null, response?: any) => void
      ) => {
        t.is(method, 'getProgramAccountsV2');
        const config = params[1] ?? {};
        v2Calls.push({ paginationKey: config.paginationKey });

        if (!config.paginationKey) {
          callback(null, {
            result: {
              accounts: [
                {
                  pubkey: page1Key,
                  account: {
                    lamports: 42,
                    owner: programId,
                    data: [Buffer.from([9, 9]).toString('base64'), 'base64'],
                    executable: false,
                    rentEpoch: 0,
                  },
                },
              ],
              paginationKey: page1Key,
            },
          });
          return;
        }

        callback(null, {
          result: {
            accounts: [
              {
                pubkey: page2Key,
                account: {
                  lamports: 43,
                  owner: programId,
                  data: [Buffer.from([8, 8]).toString('base64'), 'base64'],
                  executable: false,
                  rentEpoch: 0,
                },
              },
            ],
            paginationKey: null,
          },
        });
      },
    },
  } as any;

  const rpc = createWeb3JsRpc(createNullContext(), connection);
  const accounts = await rpc.getProgramAccounts(programId);

  t.is(accounts.length, 2);
  t.is(accounts[0].publicKey, page1Key);
  t.is(accounts[1].publicKey, page2Key);
  t.deepEqual(accounts[0].data, new Uint8Array([9, 9]));
  t.is(v2Calls.length, 2);
  t.is(v2Calls[0].paginationKey, undefined);
  t.is(v2Calls[1].paginationKey, page1Key);
});

test('getProgramAccounts rethrows non-pagination errors', async (t) => {
  const programId = publicKey(Keypair.generate().publicKey.toBase58());
  const connection = {
    rpcEndpoint: 'http://127.0.0.1:8899',
    getProgramAccounts: async () => {
      throw new Error('connection refused');
    },
  } as any;

  const rpc = createWeb3JsRpc(createNullContext(), connection);
  await t.throwsAsync(() => rpc.getProgramAccounts(programId), {
    message: /connection refused/,
  });
});

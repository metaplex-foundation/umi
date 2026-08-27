import {
  Context,
  createNullContext,
  dateTime,
  lamports,
  publicKey,
  sol,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsRpc } from '../src';
import {
  MockJsonRpcServer,
  startMockJsonRpcServer,
} from './_mockJsonRpcServer';

/**
 * Offline conformance tests for the web3.js RPC implementation, backed
 * by a local JSON-RPC stub server instead of a validator. These pin
 * the exact wire behavior — parameter encoding, result parsing and
 * error mapping — that a migration of the underlying web3.js version
 * must preserve. They run with no network access.
 */

const PUBKEY_A = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
const PUBKEY_B = publicKey('So11111111111111111111111111111111111111112');
const OWNER = publicKey('11111111111111111111111111111111');

const withServer = async (
  run: (
    server: MockJsonRpcServer,
    rpc: ReturnType<typeof createWeb3JsRpc>
  ) => Promise<void>
): Promise<void> => {
  const server = await startMockJsonRpcServer();
  const rpc = createWeb3JsRpc(createNullContext(), server.endpoint);
  try {
    await run(server, rpc);
  } finally {
    await server.close();
  }
};

test('it identifies local endpoints and reports them back', async (t) =>
  withServer(async (server, rpc) => {
    t.is(rpc.getEndpoint(), server.endpoint);
    t.is<string, string>(rpc.getCluster(), 'localnet');
  }));

test('it parses existing accounts from base64 responses', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getAccountInfo', () => ({
      context: { apiVersion: '1.18.0', slot: 123 },
      value: {
        data: [Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]).toString('base64'), 'base64'],
        executable: false,
        lamports: 42_000_000,
        owner: OWNER,
        rentEpoch: 361,
        space: 8,
      },
    }));

    const account = await rpc.getAccount(PUBKEY_A);
    t.true(account.exists);
    if (!account.exists) return;
    t.is<string, string>(account.publicKey, PUBKEY_A);
    t.is<string, string>(account.owner, OWNER);
    t.false(account.executable);
    t.deepEqual(account.lamports, lamports(42_000_000));
    t.is(account.rentEpoch, 361n);
    t.deepEqual(account.data, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

    // The request identifies the account by base58 public key.
    const request = server.lastRequest('getAccountInfo');
    t.is((request?.params as unknown[])[0], PUBKEY_A);
  }));

test('it reports missing accounts as non-existing', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getMultipleAccounts', () => ({
      context: { apiVersion: '1.18.0', slot: 123 },
      value: [
        {
          data: ['', 'base64'],
          executable: false,
          lamports: 5,
          owner: OWNER,
          rentEpoch: 361,
          space: 0,
        },
        null,
      ],
    }));

    const [existing, missing] = await rpc.getAccounts([PUBKEY_A, PUBKEY_B]);
    t.true(existing.exists);
    t.false(missing.exists);
    t.is<string, string>(missing.publicKey, PUBKEY_B);
  }));

test('it converts memcmp filter bytes to base58 on the wire', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getProgramAccounts', () => [
      {
        pubkey: PUBKEY_A,
        account: {
          data: ['', 'base64'],
          executable: false,
          lamports: 10,
          owner: OWNER,
          rentEpoch: 361,
          space: 0,
        },
      },
    ]);

    const accounts = await rpc.getProgramAccounts(OWNER, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 4, bytes: new Uint8Array([1, 2, 3]) } },
      ],
    });
    t.is(accounts.length, 1);
    t.is<string, string>(accounts[0].publicKey, PUBKEY_A);

    const request = server.lastRequest('getProgramAccounts');
    const config = (request?.params as any[])[1];
    t.deepEqual(config.filters[0], { dataSize: 165 });
    // Umi's Uint8Array memcmp bytes travel as a base58 string.
    t.is(config.filters[1].memcmp.offset, 4);
    t.is(config.filters[1].memcmp.bytes, 'Ldp');
  }));

test('it wraps balances into sol amounts', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getBalance', () => ({
      context: { apiVersion: '1.18.0', slot: 123 },
      value: 1_500_000_000,
    }));
    t.deepEqual(await rpc.getBalance(PUBKEY_A), sol(1.5));
    t.true(await rpc.accountExists(PUBKEY_A));
  }));

test('it reports zero-balance accounts as non-existing', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getBalance', () => ({
      context: { apiVersion: '1.18.0', slot: 123 },
      value: 0,
    }));
    t.false(await rpc.accountExists(PUBKEY_A));
  }));

test('it computes rent with and without header bytes', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getMinimumBalanceForRentExemption', (params) =>
      (params as number[])[0] === 0 ? 890_880 : 2_039_280
    );

    // Plain rent passes the byte length through.
    t.deepEqual(await rpc.getRent(165), lamports(2_039_280));
    t.is((server.lastRequest('getMinimumBalanceForRentExemption')?.params as number[])[0], 165);

    // Header-inclusive rent derives a per-byte price from empty-account rent.
    const headerInclusive = await rpc.getRent(100, { includesHeaderBytes: true });
    t.deepEqual(headerInclusive, lamports((890_880n / 128n) * 100n));
  }));

test('it passes the latest blockhash through unchanged', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getLatestBlockhash', () => ({
      context: { apiVersion: '1.18.0', slot: 123 },
      value: {
        blockhash: 'ELvxNy4NNoYbUCKuLm59WNCkfwHyUKzvsRsguHYZX67t',
        lastValidBlockHeight: 5_000,
      },
    }));
    t.deepEqual(await rpc.getLatestBlockhash(), {
      blockhash: 'ELvxNy4NNoYbUCKuLm59WNCkfwHyUKzvsRsguHYZX67t',
      lastValidBlockHeight: 5_000,
    });
  }));

test('it converts block times to date times', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getBlockTime', () => 1_685_000_000);
    t.is(await rpc.getBlockTime(123), dateTime(1_685_000_000));
  }));

test('it fetches genesis hashes and slots', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getGenesisHash', () => 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG');
    server.respond('getSlot', () => 424_242);
    t.is(
      await rpc.getGenesisHash(),
      'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'
    );
    t.is(await rpc.getSlot(), 424_242);
  }));

test('it maps signature statuses', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getSignatureStatuses', () => ({
      context: { apiVersion: '1.18.0', slot: 123 },
      value: [
        {
          slot: 5,
          confirmations: 3,
          err: null,
          confirmationStatus: 'confirmed',
        },
        null,
      ],
    }));

    const statuses = await rpc.getSignatureStatuses([
      new Uint8Array(64).fill(1),
      new Uint8Array(64).fill(2),
    ]);
    t.deepEqual(statuses[0], {
      slot: 5,
      confirmations: 3,
      error: null,
      commitment: 'confirmed',
    });
    t.is(statuses[1], null);
  }));

test('the generic call sends positional params and returns raw results', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('getHealth', () => 'ok');
    t.is(await rpc.call<string>('getHealth', []), 'ok');
  }));

test('the generic call appends commitment and extra to positional params', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('customMethod', () => 42);
    const result = await rpc.call<number, [number, string]>(
      'customMethod',
      [7, 'seven'],
      { commitment: 'processed', extra: { minContextSlot: 3 } }
    );
    t.is(result, 42);
    t.deepEqual(server.lastRequest('customMethod')?.params, [
      7,
      'seven',
      { commitment: 'processed', minContextSlot: 3 },
    ]);
  }));

test('the generic call merges commitment into named params', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('namedMethod', () => ({ ok: true }));
    await rpc.call<{ ok: boolean }, { foo: string }>(
      'namedMethod',
      { foo: 'bar' },
      { commitment: 'finalized', extra: { limit: 10 } }
    );
    t.deepEqual(server.lastRequest('namedMethod')?.params, {
      foo: 'bar',
      commitment: 'finalized',
      limit: 10,
    });
  }));

test('the generic call forwards custom request ids', async (t) =>
  withServer(async (server, rpc) => {
    server.respond('idMethod', () => null);
    await rpc.call('idMethod', [], { id: 'my-custom-id' });
    t.is(server.lastRequest('idMethod')?.id, 'my-custom-id');
  }));

test('the generic call resolves undefined on JSON-RPC error responses (current quirk)', async (t) =>
  withServer(async (server, rpc) => {
    server.fail('brokenMethod', { code: -32005, message: 'node is behind' });
    // The current implementation only rejects on transport errors: a
    // well-formed JSON-RPC error response reaches the jayson callback
    // as a response (not an error), so `call()` resolves with
    // `undefined` instead of rejecting. This pins that behavior; a
    // reimplementation should surface the server error instead, as a
    // deliberate, documented change.
    const result = await rpc.call('brokenMethod', []);
    t.is(result, undefined);
  }));

test('send errors carrying logs are resolved into program errors', async (t) => {
  const server = await startMockJsonRpcServer();
  const sentinel = new Error('resolved program error');
  let seenLogs: string[] | undefined;
  const context = {
    ...createNullContext(),
    programs: {
      resolveError: (error: Error & { logs?: string[] }) => {
        seenLogs = error.logs;
        return sentinel;
      },
    } as unknown as Context['programs'],
    transactions: {
      serialize: () => new Uint8Array([1, 2, 3]),
    } as unknown as Context['transactions'],
  };
  const rpc = createWeb3JsRpc(context, server.endpoint);
  server.fail('sendTransaction', {
    code: -32002,
    message: 'Transaction simulation failed: custom program error: 0x2a',
    data: {
      accounts: null,
      err: { InstructionError: [0, { Custom: 42 }] },
      logs: ['Program 11111111111111111111111111111111 failed: custom program error: 0x2a'],
      unitsConsumed: 0,
    },
  });

  try {
    const error = await t.throwsAsync(() =>
      rpc.sendTransaction({
        message: {
          version: 0,
          header: {
            numRequiredSignatures: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          accounts: [],
          blockhash: '11111111111111111111111111111111',
          instructions: [],
          addressLookupTables: [],
        },
        serializedMessage: new Uint8Array(),
        signatures: [],
      })
    );
    t.is(error, sentinel);
    t.deepEqual(seenLogs, [
      'Program 11111111111111111111111111111111 failed: custom program error: 0x2a',
    ]);
  } finally {
    await server.close();
  }
});

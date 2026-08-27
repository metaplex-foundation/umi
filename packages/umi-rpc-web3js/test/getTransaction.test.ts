import {
  base58,
  Context,
  createAmount,
  createNullContext,
  lamports,
  publicKey,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsRpc } from '../src';
import { startMockJsonRpcServer } from './_mockJsonRpcServer';

/**
 * Offline pin of the `getTransaction` response mapping: the exact
 * translation of a JSON-RPC transaction response into Umi's
 * TransactionWithMeta shape, which any web3.js migration must keep.
 */

const PAYER = '4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9';
const RECEIVER = 'So11111111111111111111111111111111111111112';
const SYSTEM = '11111111111111111111111111111111';
const MINT = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const BLOCKHASH = 'ELvxNy4NNoYbUCKuLm59WNCkfwHyUKzvsRsguHYZX67t';
const SIGNATURE_BYTES = new Uint8Array(64).fill(3);
const SIGNATURE_BASE58 = base58.deserialize(SIGNATURE_BYTES)[0];

const TRANSACTION_RESPONSE = {
  blockTime: 1_685_000_000,
  slot: 424_242,
  version: 'legacy',
  transaction: {
    signatures: [SIGNATURE_BASE58],
    message: {
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      accountKeys: [PAYER, RECEIVER, SYSTEM],
      recentBlockhash: BLOCKHASH,
      instructions: [
        { programIdIndex: 2, accounts: [0, 1], data: '3Bxs4NN8M2Yn4TLb' },
      ],
    },
  },
  meta: {
    err: null,
    fee: 5_000,
    preBalances: [1_000_000, 0, 1],
    postBalances: [994_000, 1_000, 1],
    logMessages: ['Program 11111111111111111111111111111111 success'],
    innerInstructions: [
      {
        index: 0,
        instructions: [{ programIdIndex: 2, accounts: [1], data: 'Ldp' }],
      },
    ],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint: MINT,
        owner: PAYER,
        uiTokenAmount: {
          amount: '42',
          decimals: 2,
          uiAmount: 0.42,
          uiAmountString: '0.42',
        },
      },
    ],
    postTokenBalances: [],
    loadedAddresses: { writable: [], readonly: [] },
    computeUnitsConsumed: 1_234,
    rewards: [],
    status: { Ok: null },
  },
};

const createContextWithSerializer = (): Pick<
  Context,
  'programs' | 'transactions'
> => ({
  ...createNullContext(),
  transactions: {
    serializeMessage: () => new Uint8Array([9, 9, 9]),
  } as unknown as Context['transactions'],
});

test('it maps transaction responses into umi transactions with meta', async (t) => {
  const server = await startMockJsonRpcServer();
  server.respond('getTransaction', () => TRANSACTION_RESPONSE);
  const rpc = createWeb3JsRpc(createContextWithSerializer(), server.endpoint);

  try {
    const transaction = await rpc.getTransaction(SIGNATURE_BYTES, {
      commitment: 'confirmed',
    });
    t.truthy(transaction);
    if (!transaction) return;

    // The request travels with a base58 signature and pinned config.
    const request = server.lastRequest('getTransaction');
    t.is((request?.params as unknown[])[0], SIGNATURE_BASE58);
    t.like((request?.params as unknown[])[1] as object, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    // Response envelope.
    t.deepEqual(transaction.response, {
      blockTime: 1_685_000_000n,
      slot: 424_242n,
      version: 'legacy',
    });

    // Message mapping.
    t.is(transaction.message.version, 'legacy');
    t.is<string, string>(transaction.message.blockhash, BLOCKHASH);
    t.deepEqual(transaction.message.accounts, [
      publicKey(PAYER),
      publicKey(RECEIVER),
      publicKey(SYSTEM),
    ]);
    t.deepEqual(transaction.serializedMessage, new Uint8Array([9, 9, 9]));
    t.deepEqual(transaction.signatures, [SIGNATURE_BYTES]);

    // Meta mapping.
    t.deepEqual(transaction.meta.fee, lamports(5_000));
    t.deepEqual(transaction.meta.preBalances, [
      lamports(1_000_000),
      lamports(0),
      lamports(1),
    ]);
    t.deepEqual(transaction.meta.postBalances, [
      lamports(994_000),
      lamports(1_000),
      lamports(1),
    ]);
    t.deepEqual(transaction.meta.logs, [
      'Program 11111111111111111111111111111111 success',
    ]);
    t.deepEqual(transaction.meta.innerInstructions, [
      {
        index: 0,
        instructions: [
          {
            programIndex: 2,
            accountIndexes: [1],
            data: new Uint8Array([1, 2, 3]),
          },
        ],
      },
    ]);
    t.deepEqual(transaction.meta.preTokenBalances, [
      {
        accountIndex: 1,
        amount: createAmount('42', 'splToken', 2),
        mint: publicKey(MINT),
        owner: publicKey(PAYER),
      },
    ]);
    t.deepEqual(transaction.meta.postTokenBalances, []);
    t.deepEqual(transaction.meta.loadedAddresses, {
      writable: [],
      readonly: [],
    });
    t.is(transaction.meta.computeUnitsConsumed, 1_234n);
    t.is(transaction.meta.err, null);
  } finally {
    await server.close();
  }
});

test('it returns null for unknown transactions', async (t) => {
  const server = await startMockJsonRpcServer();
  server.respond('getTransaction', () => null);
  const rpc = createWeb3JsRpc(createContextWithSerializer(), server.endpoint);
  try {
    t.is(await rpc.getTransaction(SIGNATURE_BYTES), null);
  } finally {
    await server.close();
  }
});

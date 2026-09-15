/* eslint-disable import/no-extraneous-dependencies */
import {
  createNullContext,
  lamports,
  publicKey,
  Transaction,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { createWeb3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import { toWeb3JsTransactionConfig } from '@metaplex-foundation/umi-web3js-adapters';
import { Connection } from '@solana/web3.js';
import test from 'ava';
import { createWeb3JsRpc } from '../src';

const transactions = createWeb3JsTransactionFactory();

/** The JSON that the `getTransaction` RPC method returns. */
const toRpcResponse = ({ message, signatures }: Transaction) => ({
  slot: 42,
  blockTime: 1756860000,
  version: message.version,
  meta: {
    err: null,
    fee: 5000,
    computeUnitsConsumed: 150,
    innerInstructions: [],
    logMessages: [],
    preBalances: [],
    postBalances: [],
    preTokenBalances: [],
    postTokenBalances: [],
    loadedAddresses: { readonly: [], writable: [] },
  },
  transaction: {
    message: {
      accountKeys: message.accounts,
      header: message.header,
      recentBlockhash: message.blockhash,
      instructions: message.instructions.map((instruction) => ({
        programIdIndex: instruction.programIndex,
        accounts: instruction.accountIndexes,
        data: base58.deserialize(instruction.data)[0],
      })),
      ...(message.version === 1
        ? {
            transactionConfig: toWeb3JsTransactionConfig(
              message.transactionConfig
            ),
          }
        : { addressTableLookups: [] }),
    },
    signatures: signatures.map((signature) => base58.deserialize(signature)[0]),
  },
});

const createTransfer = (version: 0 | 1): Transaction => {
  const payer = publicKey('GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB');
  return transactions.create({
    version,
    payer,
    instructions: [
      {
        programId: publicKey('11111111111111111111111111111111'),
        keys: [
          { pubkey: payer, isSigner: true, isWritable: true },
          {
            pubkey: publicKey('J2xccRtuG43drESLYznHhLhQkLTdfepcKYbiQ9BsJVaf'),
            isSigner: false,
            isWritable: true,
          },
        ],
        data: new Uint8Array([2, 0, 0, 0, 64, 66, 15, 0, 0, 0, 0, 0]),
      },
    ],
    blockhash: '11111111111111111111111111111111',
    ...(version === 1 && {
      transactionConfig: {
        computeUnitLimit: 30_000,
        priorityFee: lamports(5_000),
      },
    }),
  });
};

/** An RPC whose node answers with `result`, recording each request it receives. */
const createRpc = (result: unknown) => {
  const requests: Array<{ method: string; params: unknown[] }> = [];
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(init?.body as string);
    requests.push(request);
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: request.id, result }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };
  const rpc = createWeb3JsRpc(
    { ...createNullContext(), transactions },
    new Connection('http://127.0.0.1:1', { fetch })
  );
  return { rpc, requests };
};

test('it can fetch a V1 transaction', async (t) => {
  const transaction = createTransfer(1);
  const { rpc, requests } = createRpc(toRpcResponse(transaction));
  const fetched = await rpc.getTransaction(transaction.signatures[0]);

  // It asks the node for V1 transactions.
  t.like(requests[0], {
    method: 'getTransaction',
    params: [
      base58.deserialize(transaction.signatures[0])[0],
      { maxSupportedTransactionVersion: 1 },
    ],
  });
  t.is(fetched?.response.version, 1);
  t.deepEqual(fetched?.message, transaction.message);
  t.deepEqual(fetched?.serializedMessage, transaction.serializedMessage);
  t.deepEqual(fetched?.signatures, transaction.signatures);
  t.deepEqual(fetched?.meta.fee, lamports(5000));
});

test('it can fetch a V0 transaction', async (t) => {
  const transaction = createTransfer(0);
  const { rpc } = createRpc(toRpcResponse(transaction));
  const fetched = await rpc.getTransaction(transaction.signatures[0]);
  t.is(fetched?.response.version, 0);
  t.deepEqual(fetched?.message, transaction.message);
  t.deepEqual(fetched?.serializedMessage, transaction.serializedMessage);
});

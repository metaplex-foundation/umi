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

/** The JSON that the `getTransaction` RPC method returns for a V1 transaction. */
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
      transactionConfig: toWeb3JsTransactionConfig(message.transactionConfig),
    },
    signatures: signatures.map((signature) => base58.deserialize(signature)[0]),
  },
});

test('it can fetch a V1 transaction', async (t) => {
  const payer = publicKey('GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB');
  const transaction = transactions.create({
    version: 1,
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
    transactionConfig: {
      computeUnitLimit: 30_000,
      priorityFee: lamports(5_000),
    },
  });

  // Given an RPC whose node answers with that transaction.
  const result = toRpcResponse(transaction);
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) =>
    new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: JSON.parse(init?.body as string).id,
        result,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  const rpc = createWeb3JsRpc(
    { ...createNullContext(), transactions },
    new Connection('http://127.0.0.1:1', { fetch })
  );

  const fetched = await rpc.getTransaction(transaction.signatures[0]);
  t.is(fetched?.response.version, 1);
  t.deepEqual(fetched?.message, transaction.message);
  t.deepEqual(fetched?.serializedMessage, transaction.serializedMessage);
  t.deepEqual(fetched?.signatures, transaction.signatures);
  t.deepEqual(fetched?.meta.fee, lamports(5000));
});

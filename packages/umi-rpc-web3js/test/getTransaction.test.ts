/* eslint-disable import/no-extraneous-dependencies */
import {
  createNullContext,
  generateSigner,
  lamports,
  publicKey,
  Transaction,
  Umi,
  createBaseUmi,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import {
  createWeb3JsTransactionFactory,
  web3JsTransactionFactory,
} from '@metaplex-foundation/umi-transaction-factory-web3js';
import { toWeb3JsTransactionConfig } from '@metaplex-foundation/umi-web3js-adapters';
import { Connection } from '@solana/web3.js';
import test from 'ava';
import { createWeb3JsRpc } from '../src';

/** The JSON that the `getTransaction` RPC method returns for a transaction. */
const toRpcResponse = (transaction: Transaction) => {
  const { message } = transaction;
  return {
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
      rewards: [],
      status: { Ok: null },
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
      signatures: transaction.signatures.map(
        (signature) => base58.deserialize(signature)[0]
      ),
    },
  };
};

/** An RPC client whose node always answers with the given result. */
const createRpc = (result: unknown) => {
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    const { id } = JSON.parse(init?.body as string);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const connection = new Connection('http://127.0.0.1:1', { fetch });
  return createWeb3JsRpc(
    { ...createNullContext(), transactions: createWeb3JsTransactionFactory() },
    connection
  );
};

const createTransaction = (umi: Umi, version: 0 | 1): Transaction => {
  const payer = generateSigner(umi);
  return umi.transactions.create({
    version,
    payer: payer.publicKey,
    instructions: [
      {
        programId: publicKey('11111111111111111111111111111111'),
        keys: [
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: generateSigner(umi).publicKey,
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

test('it can fetch a V1 transaction', async (t) => {
  const umi = createBaseUmi()
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory());
  const transaction = createTransaction(umi, 1);
  const rpc = createRpc(toRpcResponse(transaction));
  const result = await rpc.getTransaction(transaction.signatures[0]);
  t.is(result?.response.version, 1);
  t.deepEqual(result?.message, transaction.message);
  t.deepEqual(result?.serializedMessage, transaction.serializedMessage);
  t.deepEqual(result?.signatures, transaction.signatures);
  t.deepEqual(result?.meta.fee, lamports(5000));
});

test('it can fetch a V0 transaction', async (t) => {
  const umi = createBaseUmi()
    .use(web3JsEddsa())
    .use(web3JsTransactionFactory());
  const transaction = createTransaction(umi, 0);
  const rpc = createRpc(toRpcResponse(transaction));
  const result = await rpc.getTransaction(transaction.signatures[0]);
  t.is(result?.response.version, 0);
  t.deepEqual(result?.message, transaction.message);
  t.deepEqual(result?.serializedMessage, transaction.serializedMessage);
});

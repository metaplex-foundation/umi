import { generateSigner, publicKey, sol } from '@metaplex-foundation/umi';
import { Connection as Web3JsConnection } from '@solana/web3.js';
import test from 'ava';
import { createUmi } from '../src';

const ENDPOINT = 'http://127.0.0.1:8899';

test('it installs every default interface implementation', (t) => {
  const umi = createUmi(ENDPOINT);

  // RPC.
  t.is(umi.rpc.getEndpoint(), ENDPOINT);
  t.is<string, string>(umi.rpc.getCluster(), 'localnet');

  // Eddsa.
  const keypair = umi.eddsa.generateKeypair();
  t.is(keypair.secretKey.length, 64);

  // Serializer (DataView implementation).
  t.deepEqual(umi.serializer.u16().serialize(42), new Uint8Array([42, 0]));

  // The program repository is installed and functional.
  t.false(umi.programs.has('myProgram'));
  umi.programs.add({
    name: 'myProgram',
    publicKey: publicKey('11111111111111111111111111111111'),
    getErrorFromCode: () => null,
    getErrorFromName: () => null,
    isOnCluster: () => true,
  });
  t.true(umi.programs.has('myProgram'));

  // Transaction factory works offline.
  const signer = generateSigner(umi);
  const transaction = umi.transactions.create({
    version: 0,
    payer: signer.publicKey,
    instructions: [],
    blockhash: '11111111111111111111111111111111',
  });
  const deserialized = umi.transactions.deserialize(
    umi.transactions.serialize(transaction)
  );
  t.deepEqual(deserialized.message, transaction.message);

  // HTTP and downloader interfaces are present.
  t.is(typeof umi.http.send, 'function');
  t.is(typeof umi.downloader.download, 'function');

  // Amounts flow through with bigint basis points.
  t.deepEqual(sol(1).basisPoints, 1_000_000_000n);
});

test('it accepts an existing web3.js connection', (t) => {
  const connection = new Web3JsConnection(ENDPOINT, 'processed');
  const umi = createUmi(connection);
  t.is(umi.rpc.getEndpoint(), ENDPOINT);
  // The provided connection instance is reused, not wrapped in a new one.
  t.is((umi.rpc as { connection?: Web3JsConnection }).connection, connection);
});

test('it forwards rpc options when given an endpoint', (t) => {
  const umi = createUmi(ENDPOINT, { commitment: 'processed' });
  const { connection } = umi.rpc as unknown as {
    connection: Web3JsConnection;
  };
  t.is(connection.commitment, 'processed');
});

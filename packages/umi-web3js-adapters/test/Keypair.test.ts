import { publicKeyBytes } from '@metaplex-foundation/umi';
import test from 'ava';
import { fromWeb3JsKeypair, toWeb3JsKeypair } from '../src';
import { bytes, generateWeb3JsKeypair } from './_setup';

test('it converts a web3.js keypair to a umi keypair', async (t) => {
  const web3JsKeypair = await generateWeb3JsKeypair();
  const umiKeypair = fromWeb3JsKeypair(web3JsKeypair);
  t.is(web3JsKeypair.publicKey.toBase58(), umiKeypair.publicKey);
  t.deepEqual(bytes(umiKeypair.secretKey), bytes(web3JsKeypair.secretKey));
  t.is(umiKeypair.secretKey.length, 64);
});

test('it converts a umi keypair to a web3.js keypair', async (t) => {
  const umiKeypair = fromWeb3JsKeypair(await generateWeb3JsKeypair());
  const web3JsKeypair = toWeb3JsKeypair(umiKeypair);
  t.is(web3JsKeypair.publicKey.toBase58(), umiKeypair.publicKey);
  t.deepEqual(bytes(web3JsKeypair.secretKey), bytes(umiKeypair.secretKey));
});

test('it round-trips keypairs without altering key material', async (t) => {
  const original = await generateWeb3JsKeypair();
  const roundTripped = toWeb3JsKeypair(fromWeb3JsKeypair(original));
  t.true(roundTripped.publicKey.equals(original.publicKey));
  t.deepEqual(bytes(roundTripped.secretKey), bytes(original.secretKey));
});

test('the secret key embeds the public key in its last 32 bytes', async (t) => {
  const umiKeypair = fromWeb3JsKeypair(await generateWeb3JsKeypair());
  t.deepEqual(
    bytes(umiKeypair.secretKey.slice(32)),
    publicKeyBytes(umiKeypair.publicKey)
  );
});

import { publicKey, publicKeyBytes } from '@metaplex-foundation/umi';
import { PublicKey as Web3JsPublicKey } from '@solana/web3.js';
import test from 'ava';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from '../src';
import { bytes, generateWeb3JsKeypair } from './_setup';

test('it converts a web3.js public key to a umi public key', async (t) => {
  const web3JsPublicKey = (await generateWeb3JsKeypair()).publicKey;
  const umiPublicKey = fromWeb3JsPublicKey(web3JsPublicKey);
  t.is(web3JsPublicKey.toBase58(), umiPublicKey);
  t.deepEqual(publicKeyBytes(umiPublicKey), bytes(web3JsPublicKey.toBytes()));
});

test('it converts a umi public key to a web3.js public key', async (t) => {
  const umiPublicKey = fromWeb3JsPublicKey(
    (await generateWeb3JsKeypair()).publicKey
  );
  const web3JsPublicKey = toWeb3JsPublicKey(umiPublicKey);
  t.is(web3JsPublicKey.toBase58(), umiPublicKey);
});

test('it round-trips public keys in both directions', async (t) => {
  const original = (await generateWeb3JsKeypair()).publicKey;
  const roundTripped = toWeb3JsPublicKey(fromWeb3JsPublicKey(original));
  t.true(roundTripped.equals(original));

  const umiOriginal = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  t.is(fromWeb3JsPublicKey(toWeb3JsPublicKey(umiOriginal)), umiOriginal);
});

test('it preserves well-known program addresses', (t) => {
  const systemProgram = publicKey('11111111111111111111111111111111');
  t.is(
    fromWeb3JsPublicKey(toWeb3JsPublicKey(systemProgram)),
    systemProgram
  );
  t.true(toWeb3JsPublicKey(systemProgram).equals(Web3JsPublicKey.default));
});

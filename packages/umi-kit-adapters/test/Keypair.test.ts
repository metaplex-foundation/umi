import test from 'ava';
import {
  createUmi,
  generateSigner,
  publicKeyBytes,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import {
  extractEd25519SecretKeyFromPkcs8,
  fromKitKeypair,
  toKitKeypair,
} from '../src';

test('fromKitKeypair converts Kit CryptoKeyPair to umi Keypair and back', async (t) => {
  const umi = createUmi().use(web3JsEddsa());
  const originalKeypair = generateSigner(umi);
  const kitKeypair = await toKitKeypair(originalKeypair);
  const convertedKeypair = await fromKitKeypair(kitKeypair);
  t.deepEqual(
    publicKeyBytes(convertedKeypair.publicKey),
    publicKeyBytes(originalKeypair.publicKey)
  );
  t.deepEqual(convertedKeypair.secretKey, originalKeypair.secretKey);
});

test('toKitKeypair converts umi Keypair to Kit CryptoKeyPair and back', async (t) => {
  const umi = createUmi().use(web3JsEddsa());
  const keypair = generateSigner(umi);
  const kitKeypair = await toKitKeypair(keypair);
  const exportedPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', kitKeypair.publicKey)
  );
  const exportedSecretKeyPkcs8 = new Uint8Array(
    await crypto.subtle.exportKey('pkcs8', kitKeypair.privateKey)
  );
  const exportedSecretKey = extractEd25519SecretKeyFromPkcs8(
    exportedSecretKeyPkcs8,
    exportedPublicKey
  );
  t.deepEqual(exportedSecretKey, keypair.secretKey);
  t.deepEqual(exportedPublicKey, publicKeyBytes(keypair.publicKey));
});

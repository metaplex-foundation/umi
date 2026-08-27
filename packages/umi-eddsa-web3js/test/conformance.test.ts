import { publicKey, publicKeyBytes, utf8 } from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsEddsa } from '../src';

/**
 * Pinned conformance vectors for the EddsaInterface implementation.
 *
 * These constants were generated from the current web3.js-v1-backed
 * implementation and must remain stable across any reimplementation
 * (e.g. a pure-noble engine): they are the contract that keygen, PDA
 * derivation, curve checks and signatures do not change behavior.
 */
const eddsa = createWeb3JsEddsa();

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

test('it derives the RFC 8032 public key from an all-zero seed', (t) => {
  const keypair = eddsa.createKeypairFromSeed(new Uint8Array(32));
  t.is<string, string>(
    keypair.publicKey,
    '4zvwRjXUKGfvwnParsHAS3HuSVzV5cA4McphgmoCtajS'
  );
});

test('it derives a deterministic keypair from a fixed seed', (t) => {
  const keypair = eddsa.createKeypairFromSeed(new Uint8Array(32).fill(7));
  t.is<string, string>(
    keypair.publicKey,
    'GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB'
  );
  t.is(keypair.secretKey.length, 64);
  t.deepEqual(
    keypair.secretKey.slice(32),
    publicKeyBytes(keypair.publicKey)
  );
});

test('it restores a keypair from its 64-byte secret key', (t) => {
  const original = eddsa.generateKeypair();
  const restored = eddsa.createKeypairFromSecretKey(original.secretKey);
  t.is<string, string>(restored.publicKey, original.publicKey);
  t.deepEqual(restored.secretKey, original.secretKey);
});

test('it rejects secret keys whose public half does not match', (t) => {
  const [a, b] = [eddsa.generateKeypair(), eddsa.generateKeypair()];
  const franken = new Uint8Array(64);
  franken.set(a.secretKey.slice(0, 32));
  franken.set(publicKeyBytes(b.publicKey), 32);
  t.throws(() => eddsa.createKeypairFromSecretKey(franken));
});

test('it rejects secret keys of the wrong length', (t) => {
  t.throws(() => eddsa.createKeypairFromSecretKey(new Uint8Array(32)));
});

test('signatures are deterministic and match the pinned vector', (t) => {
  const keypair = eddsa.createKeypairFromSeed(new Uint8Array(32).fill(7));
  const message = utf8.serialize('umi eddsa conformance vector');
  const signature = eddsa.sign(message, keypair);
  t.is(signature.length, 64);
  t.is(
    hex(signature),
    'e303b89705a757aa5b25569000264644751f7b64e76b2c86e525b911a3b062f6' +
      '73ffc258cb11ce7310fe6c6e416f94209761b08534e4d6220e5050e3472f3800'
  );
  t.deepEqual(eddsa.sign(message, keypair), signature);
});

test('it signs and verifies the empty message', (t) => {
  const keypair = eddsa.generateKeypair();
  const signature = eddsa.sign(new Uint8Array(0), keypair);
  t.true(eddsa.verify(new Uint8Array(0), signature, keypair.publicKey));
});

test('verification fails for tampered inputs', (t) => {
  const keypair = eddsa.generateKeypair();
  const message = utf8.serialize('Hello world!');
  const signature = eddsa.sign(message, keypair);

  // Tampered message.
  t.false(eddsa.verify(utf8.serialize('Hello world?'), signature, keypair.publicKey));

  // Tampered signature.
  const tampered = new Uint8Array(signature);
  tampered[0] = (tampered[0] + 1) % 256;
  t.false(eddsa.verify(message, tampered, keypair.publicKey));

  // Wrong public key.
  t.false(
    eddsa.verify(message, signature, eddsa.generateKeypair().publicKey)
  );
});

test('it finds the pinned program-derived addresses', (t) => {
  const [helloPda, helloBump] = eddsa.findPda(
    publicKey('11111111111111111111111111111111'),
    [utf8.serialize('hello')]
  );
  t.is<string, string>(helloPda, '2PjSSVURwJV4o9wz1BDVwwddvcUCuF1NKFpcQBF9emYJ');
  t.is(helloBump, 255);

  // The token-metadata PDA for wrapped SOL, derived like real clients do.
  const tokenMetadataProgram = publicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  );
  const wrappedSol = publicKey('So11111111111111111111111111111111111111112');
  const [metadataPda, metadataBump] = eddsa.findPda(tokenMetadataProgram, [
    utf8.serialize('metadata'),
    publicKeyBytes(tokenMetadataProgram),
    publicKeyBytes(wrappedSol),
  ]);
  t.is<string, string>(
    metadataPda,
    '6dM4TqWyWJsbx7obrdLcviBkTafD5E8av61zfU6jq57X'
  );
  t.is(metadataBump, 255);
});

test('program-derived addresses are off the curve', (t) => {
  const [pda] = eddsa.findPda(publicKey('11111111111111111111111111111111'), [
    utf8.serialize('hello'),
  ]);
  t.false(eddsa.isOnCurve(pda));
});

test('generated public keys are on the curve', (t) => {
  t.true(eddsa.isOnCurve(eddsa.generateKeypair().publicKey));
});

test('the all-zero public key is reported on-curve (web3.js v1 quirk)', (t) => {
  // web3.js v1 decompresses the all-zero point successfully. Any
  // reimplementation must either reproduce this or change it as a
  // documented breaking change.
  t.true(eddsa.isOnCurve(publicKey('11111111111111111111111111111111')));
});

test('generated keypairs are unique and well-formed', (t) => {
  const a = eddsa.generateKeypair();
  const b = eddsa.generateKeypair();
  t.not<string, string>(a.publicKey, b.publicKey);
  t.deepEqual(a.secretKey.slice(32), publicKeyBytes(a.publicKey));
});

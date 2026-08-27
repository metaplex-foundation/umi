import {
  createBaseUmi,
  generateSigner,
  isKeypairSigner,
  isPublicKey,
  utf8,
} from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import test from 'ava';
import { createDerivedSigner, isDerivedKeypair } from '../src';

const createUmi = () => createBaseUmi().use(web3JsEddsa());

test('it derives a new keypair signer from an existing signer', async (t) => {
  // Given a Umi instance and an existing signer.
  const umi = createUmi();
  const originalSigner = generateSigner(umi);

  // When we derive a new signer from it using a message.
  const derivedSigner = await createDerivedSigner(
    umi,
    originalSigner,
    'Hello world!'
  );

  // Then we get a valid keypair signer.
  t.true(isPublicKey(derivedSigner.publicKey));
  t.true(isKeypairSigner(derivedSigner));
  t.is(derivedSigner.secretKey.length, 64);

  // And its public key differs from the original signer's public key.
  t.not(derivedSigner.publicKey, originalSigner.publicKey);

  // And it keeps track of the original signer.
  t.is(derivedSigner.originalSigner, originalSigner);
});

test('it identifies derived signers via the isDerivedKeypair helper', async (t) => {
  // Given a signer derived from an existing signer.
  const umi = createUmi();
  const originalSigner = generateSigner(umi);
  const derivedSigner = await createDerivedSigner(
    umi,
    originalSigner,
    'Hello world!'
  );

  // Then the derived signer is recognized as a derived keypair.
  t.true(isDerivedKeypair(derivedSigner));

  // Whereas a plain keypair signer is not.
  t.false(isDerivedKeypair(originalSigner));
});

test('it derives the same keypair for the same signer and message', async (t) => {
  // Given a Umi instance and an existing signer.
  const umi = createUmi();
  const originalSigner = generateSigner(umi);

  // When we derive two signers using the same message.
  const derivedSignerA = await createDerivedSigner(
    umi,
    originalSigner,
    'Same message'
  );
  const derivedSignerB = await createDerivedSigner(
    umi,
    originalSigner,
    'Same message'
  );

  // Then both derived signers use the exact same keypair.
  t.is(derivedSignerA.publicKey, derivedSignerB.publicKey);
  t.deepEqual(derivedSignerA.secretKey, derivedSignerB.secretKey);
});

test('it derives the same keypair whether the message is a string or bytes', async (t) => {
  // Given a Umi instance and an existing signer.
  const umi = createUmi();
  const originalSigner = generateSigner(umi);

  // When we derive one signer from a string message
  // and another from its serialized bytes.
  const fromString = await createDerivedSigner(
    umi,
    originalSigner,
    'Same message'
  );
  const fromBytes = await createDerivedSigner(
    umi,
    originalSigner,
    utf8.serialize('Same message')
  );

  // Then both derived signers use the exact same keypair.
  t.is(fromString.publicKey, fromBytes.publicKey);
  t.deepEqual(fromString.secretKey, fromBytes.secretKey);
});

test('it derives different keypairs for different messages', async (t) => {
  // Given a Umi instance and an existing signer.
  const umi = createUmi();
  const originalSigner = generateSigner(umi);

  // When we derive two signers using different messages.
  const derivedSignerA = await createDerivedSigner(
    umi,
    originalSigner,
    'Message A'
  );
  const derivedSignerB = await createDerivedSigner(
    umi,
    originalSigner,
    'Message B'
  );

  // Then the derived signers use different keypairs.
  t.not(derivedSignerA.publicKey, derivedSignerB.publicKey);
});

test('it derives different keypairs for different original signers', async (t) => {
  // Given two distinct original signers.
  const umi = createUmi();
  const originalSignerA = generateSigner(umi);
  const originalSignerB = generateSigner(umi);

  // When we derive a signer from each using the same message.
  const derivedSignerA = await createDerivedSigner(
    umi,
    originalSignerA,
    'Same message'
  );
  const derivedSignerB = await createDerivedSigner(
    umi,
    originalSignerB,
    'Same message'
  );

  // Then the derived signers use different keypairs.
  t.not(derivedSignerA.publicKey, derivedSignerB.publicKey);
});

test('it can sign messages that verify against the derived public key', async (t) => {
  // Given a signer derived from an existing signer.
  const umi = createUmi();
  const originalSigner = generateSigner(umi);
  const derivedSigner = await createDerivedSigner(
    umi,
    originalSigner,
    'Hello world!'
  );

  // When the derived signer signs a message.
  const message = utf8.serialize('Sign me please');
  const signature = await derivedSigner.signMessage(message);

  // Then the signature is valid for the derived public key.
  t.true(umi.eddsa.verify(message, signature, derivedSigner.publicKey));

  // But not for the original signer's public key.
  t.false(umi.eddsa.verify(message, signature, originalSigner.publicKey));
});

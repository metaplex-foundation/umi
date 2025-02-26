import { isPublicKey, utf8 } from '@metaplex-foundation/umi';
import test from 'ava';
import { createWeb3JsEddsa } from '../src';

test('it can create a new private key', async (t) => {
  // Given an EDDSA interface.
  const eddsa = createWeb3JsEddsa();

  // When we generate a new keypair.
  const keypair = eddsa.generateKeypair();

  // Then the public key is valid.
  t.true(isPublicKey(keypair.publicKey));
  t.true(eddsa.isOnCurve(keypair.publicKey));

  // And the secret key is valid.
  t.true(
    typeof keypair.secretKey === 'object' &&
      typeof keypair.secretKey.BYTES_PER_ELEMENT === 'number' &&
      typeof keypair.secretKey.length === 'number' &&
      keypair.secretKey.BYTES_PER_ELEMENT === 1 &&
      keypair.secretKey.length === 64
  );
});

test('it can sign and verify messages', async (t) => {
  // Given a keypair.
  const eddsa = createWeb3JsEddsa();
  const keypair = eddsa.generateKeypair();

  // When that keypair signs a message and then verifies it.
  const message = utf8.serialize('Hello world!');
  const signature = eddsa.sign(message, keypair);
  const verified = eddsa.verify(message, signature, keypair.publicKey);

  // Then we expect the signature to be valid.
  t.true(verified);
});

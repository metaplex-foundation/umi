import test from 'ava';
import { createNoopSigner, publicKey } from '../src';

test('it can create PublicKeys from base 58 strings', (t) => {
  t.deepEqual(publicKey('11111111111111111111111111111111'), {
    bytes: new Uint8Array(Array(32).fill(0)),
  });

  t.deepEqual(publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9'), {
    bytes: new Uint8Array([
      48, 195, 33, 91, 254, 142, 96, 119, 69, 93, 155, 127, 231, 0, 98, 115,
      193, 101, 97, 80, 204, 136, 168, 50, 218, 168, 254, 212, 56, 247, 237,
      178,
    ]),
  });
});

test('it can create PublicKeys from bytes', (t) => {
  const bytes = new Uint8Array([
    48, 195, 33, 91, 254, 142, 96, 119, 69, 93, 155, 127, 231, 0, 98, 115, 193,
    101, 97, 80, 204, 136, 168, 50, 218, 168, 254, 212, 56, 247, 237, 178,
  ]);
  const key = publicKey(bytes);

  // The bytes are copied.
  t.deepEqual(key, { bytes });
  t.not(key.bytes, bytes);
});

test('it can create PublicKeys from other public keys', (t) => {
  const keyA = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  const keyB = publicKey(keyA);

  // The bytes are copied.
  t.deepEqual(keyB, keyA);
  t.not(keyB, keyA);
});

test('it can create PublicKeys from other public key wrappers like Signers', (t) => {
  const keyA = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  const signerA = createNoopSigner(keyA);
  const keyB = publicKey(signerA);

  // The bytes are copied.
  t.deepEqual(keyB, signerA.publicKey);
  t.not(keyB, signerA.publicKey);
});

test('it fails to create PublicKeys if its length is not 32 bytes', (t) => {
  const expectation = { message: 'Invalid public key' };
  t.throws(() => publicKey(''), expectation);
  t.throws(() => publicKey('1'), expectation);
  t.throws(() => publicKey('x'), expectation);
  t.throws(() => publicKey('x'.repeat(31)), expectation);
  t.throws(() => publicKey('x'.repeat(33)), expectation);
  t.throws(() => publicKey(new Uint8Array()), expectation);
  t.throws(() => publicKey(new Uint8Array([0])), expectation);
  t.throws(() => publicKey(new Uint8Array([1])), expectation);
  t.throws(() => publicKey(new Uint8Array(Array(31).fill(42))), expectation);
  t.throws(() => publicKey(new Uint8Array(Array(33).fill(42))), expectation);
  t.throws(() => publicKey({ bytes: new Uint8Array([42]) }), expectation);
  t.throws(
    () => publicKey({ publicKey: { bytes: new Uint8Array([42]) } }),
    expectation
  );
});

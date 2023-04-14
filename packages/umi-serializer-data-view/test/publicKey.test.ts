import test from 'ava';
import { base16, publicKey as toPublicKey } from '@metaplex-foundation/umi';
import { createDataViewSerializer } from '../src';
import { s, d } from './_helpers';

test('serialization', (t) => {
  const { publicKey } = createDataViewSerializer();

  const keyA = toPublicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  const keyABytes = base16.deserialize(keyA.bytes)[0];
  s(t, publicKey(), keyA, keyABytes);

  const keyB = toPublicKey('11111111111111111111111111111111');
  const keyBBytes = base16.deserialize(keyB.bytes)[0];
  s(t, publicKey(), keyB, keyBBytes);

  const throwExpectation = {
    message: (m: string) => m.includes('Invalid public key'),
  };
  t.throws(() => publicKey().serialize(''), throwExpectation);
  t.throws(() => publicKey().serialize('L'), throwExpectation);
  t.throws(() => publicKey().serialize('x'.repeat(32)), throwExpectation);
});

test('deserialization', (t) => {
  const { publicKey } = createDataViewSerializer();

  const keyA = toPublicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
  const keyABytes = base16.deserialize(keyA.bytes)[0];
  d(t, publicKey(), keyABytes, keyA, 32);

  const keyB = toPublicKey('11111111111111111111111111111111');
  const keyBBytes = base16.deserialize(keyB.bytes)[0];
  d(t, publicKey(), keyBBytes, keyB, 32);
});

test('description', (t) => {
  const { publicKey } = createDataViewSerializer();
  t.is(publicKey().description, 'publicKey');
  t.is(publicKey({ description: 'My publicKey' }).description, 'My publicKey');
});

test('sizes', (t) => {
  const { publicKey } = createDataViewSerializer();
  t.is(publicKey().fixedSize, 32);
  t.is(publicKey().maxSize, 32);
});

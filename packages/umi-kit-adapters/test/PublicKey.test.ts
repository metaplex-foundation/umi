import test from 'ava';
import { createUmi, generateSigner } from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { generateKeyPair } from '@solana/keys';
import { getAddressFromPublicKey } from '@solana/kit';
import { fromKitAddress, toKitAddress } from '../src';

test('fromKitAddress converts Kit Address to umi PublicKey', async (t) => {
    const publicKey = await getAddressFromPublicKey((await generateKeyPair()).publicKey);
    t.deepEqual(publicKey.toString(), fromKitAddress(publicKey).toString())
});

test('toKitAddress converts umi PublicKey to Kit Address', (t) => {
    const umi = createUmi().use(web3JsEddsa());
    const { publicKey } = generateSigner(umi);
    t.deepEqual(publicKey.toString(), toKitAddress(publicKey).toString())
});

test('it can roundtrip a public key back to Umi', async (t) => {
    const umi = createUmi().use(web3JsEddsa());
    const { publicKey } = generateSigner(umi);
    t.deepEqual(publicKey.toString(), fromKitAddress(toKitAddress(publicKey)).toString())
});

test('it can roundtrip a public key back to Kit', async (t) => {
    const publicKey = await getAddressFromPublicKey((await generateKeyPair()).publicKey);
    t.deepEqual(publicKey.toString(), toKitAddress(fromKitAddress(publicKey)).toString())
});

import test from 'ava';
import {
  createBaseUmi,
  generateSigner,
  generatedSignerIdentity,
  generatedSignerPayer,
  keypairIdentity,
  keypairPayer,
  signerIdentity,
  signerPayer,
} from '../src';
import { mockEddsaUmiPlugin } from './_setup';

test('signerIdentity sets both the identity and the payer by default', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const signer = generateSigner(umi);
  umi.use(signerIdentity(signer));
  t.is(umi.identity, signer);
  t.is(umi.payer, signer);
});

test('signerIdentity can leave the payer untouched', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const signer = generateSigner(umi);
  const originalPayer = umi.payer;
  umi.use(signerIdentity(signer, false));
  t.is(umi.identity, signer);
  t.is(umi.payer, originalPayer);
  t.not(umi.payer, signer);
});

test('signerPayer only sets the payer', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const signer = generateSigner(umi);
  const originalIdentity = umi.identity;
  umi.use(signerPayer(signer));
  t.is(umi.payer, signer);
  t.is(umi.identity, originalIdentity);
});

test('generatedSignerIdentity sets a generated identity and payer', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  umi.use(generatedSignerIdentity());
  t.is(typeof umi.identity.publicKey, 'string');
  t.is(umi.payer, umi.identity);
});

test('generatedSignerIdentity can leave the payer untouched', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const originalPayer = umi.payer;
  umi.use(generatedSignerIdentity(false));
  t.is(typeof umi.identity.publicKey, 'string');
  t.is(umi.payer, originalPayer);
});

test('generatedSignerPayer sets a generated payer only', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const originalIdentity = umi.identity;
  umi.use(generatedSignerPayer());
  t.is(typeof umi.payer.publicKey, 'string');
  t.is(umi.identity, originalIdentity);
});

test('keypairIdentity sets the identity and payer from a keypair', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const keypair = umi.eddsa.generateKeypair();
  umi.use(keypairIdentity(keypair));
  t.is(umi.identity.publicKey, keypair.publicKey);
  t.is(umi.payer, umi.identity);
});

test('keypairIdentity can leave the payer untouched', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const originalPayer = umi.payer;
  const keypair = umi.eddsa.generateKeypair();
  umi.use(keypairIdentity(keypair, false));
  t.is(umi.identity.publicKey, keypair.publicKey);
  t.is(umi.payer, originalPayer);
});

test('keypairPayer sets the payer from a keypair', (t) => {
  const umi = createBaseUmi().use(mockEddsaUmiPlugin());
  const originalIdentity = umi.identity;
  const keypair = umi.eddsa.generateKeypair();
  umi.use(keypairPayer(keypair));
  t.is(umi.payer.publicKey, keypair.publicKey);
  t.is(umi.identity, originalIdentity);
});

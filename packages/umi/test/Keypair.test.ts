import test from 'ava';
import {
  createSignerFromKeypair,
  generateSigner,
  isKeypairSigner,
  createNoopSigner,
  publicKey,
  transactionBuilder,
} from '../src';
import { createMockUmi, transferSol } from './_setup';

test('it can generate a new keypair signer', (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  t.is(typeof signer.publicKey, 'string');
  t.is(signer.secretKey.length, 64);
  t.true(isKeypairSigner(signer));
});

test('it generates unique keypair signers', (t) => {
  const umi = createMockUmi();
  const signerA = generateSigner(umi);
  const signerB = generateSigner(umi);
  t.not(signerA.publicKey, signerB.publicKey);
});

test('it can create a signer from an existing keypair', (t) => {
  const umi = createMockUmi();
  const keypair = umi.eddsa.generateKeypair();
  const signer = createSignerFromKeypair(umi, keypair);
  t.is(signer.publicKey, keypair.publicKey);
  t.is(signer.secretKey, keypair.secretKey);
});

test('a keypair signer signs messages using the eddsa interface', async (t) => {
  const umi = createMockUmi();
  const keypair = umi.eddsa.generateKeypair();
  const signer = createSignerFromKeypair(umi, keypair);
  const message = new Uint8Array([1, 2, 3]);

  const signature = await signer.signMessage(message);
  t.deepEqual(signature, umi.eddsa.sign(message, keypair));
  t.true(umi.eddsa.verify(message, signature, signer.publicKey));
});

test('a keypair signer can sign a transaction', async (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  const transaction = transactionBuilder()
    .add(transferSol(umi, { from: signer }))
    .setFeePayer(signer)
    .setBlockhash('11111111111111111111111111111111')
    .build(umi);
  t.true(transaction.signatures[0].every((byte) => byte === 0));

  const signed = await signer.signTransaction(transaction);
  t.deepEqual(
    signed.signatures[0],
    umi.eddsa.sign(transaction.serializedMessage, signer)
  );
});

test('a keypair signer refuses to sign a transaction it is not required to sign', async (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  const otherSigner = generateSigner(umi);
  const transaction = transactionBuilder()
    .add(transferSol(umi, { from: signer }))
    .setFeePayer(signer)
    .setBlockhash('11111111111111111111111111111111')
    .build(umi);

  await t.throwsAsync(() => otherSigner.signTransaction(transaction), {
    message: /The provided signer is not required to sign this transaction/,
  });
});

test('a keypair signer can sign multiple transactions at once', async (t) => {
  const umi = createMockUmi();
  const signer = generateSigner(umi);
  const buildTransfer = () =>
    transactionBuilder()
      .add(transferSol(umi, { from: signer }))
      .setFeePayer(signer)
      .setBlockhash('11111111111111111111111111111111')
      .build(umi);
  const transactions = [buildTransfer(), buildTransfer()];

  const signed = await signer.signAllTransactions(transactions);
  t.is(signed.length, 2);
  signed.forEach((transaction, index) => {
    t.deepEqual(
      transaction.signatures[0],
      umi.eddsa.sign(transactions[index].serializedMessage, signer)
    );
  });
});

test('it can identify keypair signers', (t) => {
  const umi = createMockUmi();
  t.true(isKeypairSigner(generateSigner(umi)));
  t.false(
    isKeypairSigner(
      createNoopSigner(publicKey('11111111111111111111111111111111'))
    )
  );
});

import test from 'ava';
import {
  Signer,
  Transaction,
  createNoopSigner,
  createNullSigner,
  generateSigner,
  isSigner,
  publicKey,
  signAllTransactions,
  signTransaction,
  transactionBuilder,
  uniqueSigners,
} from '../src';
import { createMockUmi, transferSol } from './_setup';

const buildTransaction = (
  umi: ReturnType<typeof createMockUmi>,
  signers: Signer[] = []
): Transaction => {
  let builder = transactionBuilder()
    .add(transferSol(umi, { from: signers[0] }))
    .setBlockhash('11111111111111111111111111111111');
  if (signers[0]) builder = builder.setFeePayer(signers[0]);
  return builder.build(umi);
};

test('it can identify signers', (t) => {
  const umi = createMockUmi();
  const key = publicKey('11111111111111111111111111111111');
  t.true(isSigner(generateSigner(umi)));
  t.true(isSigner(createNoopSigner(key)));
  t.false(isSigner(key));
  t.false(isSigner('11111111111111111111111111111111'));
  t.false(isSigner({ publicKey: key }));
});

test('it can deduplicate signers by public key', (t) => {
  const umi = createMockUmi();
  const signerA = generateSigner(umi);
  const signerB = generateSigner(umi);
  const signerACopy = createNoopSigner(signerA.publicKey);
  const deduplicated = uniqueSigners([signerA, signerB, signerACopy, signerB]);
  t.deepEqual(deduplicated, [signerA, signerB]);
});

test('a noop signer returns messages and transactions unchanged', async (t) => {
  const umi = createMockUmi();
  const signer = createNoopSigner(publicKey('11111111111111111111111111111111'));
  t.is('11111111111111111111111111111111', signer.publicKey as string);

  const message = new Uint8Array([1, 2, 3]);
  t.is(await signer.signMessage(message), message);

  const transaction = buildTransaction(umi);
  t.is(await signer.signTransaction(transaction), transaction);
  t.deepEqual(await signer.signAllTransactions([transaction]), [transaction]);
});

test('a null signer throws on every operation', async (t) => {
  const signer = createNullSigner();
  const expectation = { message: /Trying to use a NullSigner/ };
  t.throws(() => signer.publicKey, expectation);
  t.throws(() => signer.signMessage(new Uint8Array()), expectation);
  await t.throwsAsync(
    async () => signer.signTransaction({} as Transaction),
    expectation
  );
  await t.throwsAsync(
    async () => signer.signAllTransactions([]),
    expectation
  );
});

test('it can sign a transaction with multiple signers', async (t) => {
  const umi = createMockUmi();
  const signerA = generateSigner(umi);
  const signerB = generateSigner(umi);
  const transaction = transactionBuilder()
    .add(transferSol(umi, { from: signerA }))
    .add(transferSol(umi, { from: signerB }))
    .setFeePayer(signerA)
    .setBlockhash('11111111111111111111111111111111')
    .build(umi);

  // Initially, all signatures are zeroed out.
  t.is(transaction.signatures.length, 2);
  t.true(transaction.signatures.every((sig) => sig.every((b) => b === 0)));

  const signed = await signTransaction(transaction, [signerA, signerB]);
  t.false(signed.signatures[0].every((byte) => byte === 0));
  t.false(signed.signatures[1].every((byte) => byte === 0));

  // The original transaction was not mutated.
  t.true(transaction.signatures.every((sig) => sig.every((b) => b === 0)));
});

test('signAllTransactions signs each transaction with its own signers', async (t) => {
  const umi = createMockUmi();
  const signerA = generateSigner(umi);
  const signerB = generateSigner(umi);
  const transactionA = buildTransaction(umi, [signerA]);
  const transactionB = buildTransaction(umi, [signerB]);

  const signAllCalls: string[] = [];
  const wrap = (signer: Signer): Signer => ({
    ...signer,
    signAllTransactions: async (transactions) => {
      signAllCalls.push(signer.publicKey);
      return signer.signAllTransactions(transactions);
    },
  });

  const signed = await signAllTransactions([
    { transaction: transactionA, signers: [wrap(signerA)] },
    { transaction: transactionB, signers: [wrap(signerB)] },
  ]);

  t.is(signed.length, 2);
  t.false(signed[0].signatures[0].every((byte) => byte === 0));
  t.false(signed[1].signatures[0].every((byte) => byte === 0));

  // Each signer only signs one transaction, so signAllTransactions
  // is never used on the signers themselves.
  t.deepEqual(signAllCalls, []);
});

test('signAllTransactions batches signatures for shared signers', async (t) => {
  const umi = createMockUmi();
  const sharedSigner = generateSigner(umi);
  const transactionA = buildTransaction(umi, [sharedSigner]);
  const transactionB = buildTransaction(umi, [sharedSigner]);

  const signAllCalls: number[] = [];
  const wrappedSigner: Signer = {
    ...sharedSigner,
    signAllTransactions: async (transactions) => {
      signAllCalls.push(transactions.length);
      return sharedSigner.signAllTransactions(transactions);
    },
  };

  const signed = await signAllTransactions([
    { transaction: transactionA, signers: [wrappedSigner] },
    { transaction: transactionB, signers: [wrappedSigner] },
  ]);

  t.is(signed.length, 2);
  // The shared signer signed both transactions in a single call.
  t.deepEqual(signAllCalls, [2]);
  t.false(signed[0].signatures[0].every((byte) => byte === 0));
  t.false(signed[1].signatures[0].every((byte) => byte === 0));
});

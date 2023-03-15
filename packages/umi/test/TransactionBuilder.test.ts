import test from 'ava';
import { transactionBuilder } from '../src';
import { createUmi, transferSol } from './_setup';

test.skip('it can get the size of the transaction to build', (t) => {
  const umi = createUmi();
  const builder = transactionBuilder().add(transferSol(umi));
  t.is(builder.getTransactionSize(umi), 305);
});

test.skip('it can split instructions by index', (t) => {
  // Given a builder with two instructions.
  const umi = createUmi();
  const instructionA = transferSol(umi);
  const instructionB = transferSol(umi);
  const builder = transactionBuilder().add(instructionA).add(instructionB);

  // When we split the builder by index in the middle.
  const [first, second] = builder.splitByIndex(1);

  // Then we get two builders with the correct instructions.
  t.deepEqual(first.items, [instructionA]);
  t.deepEqual(second.items, [instructionB]);
});

test.skip('it can split instructions by transaction size', (t) => {
  // Given a builder with 100 instructions.
  const umi = createUmi();
  const instructions = Array.from({ length: 100 }).map(() => transferSol(umi));
  const builder = transactionBuilder().add(instructions);

  // When we split the builder by transaction size.
  const builders = builder.unsafeSplitByTransactionSize(umi);

  // Then we get 15 builders such that each fit in one transaction.
  t.is(builders.length, 15);
  builders.forEach((b) => t.true(b.fitsInOneTransaction(umi)));
});

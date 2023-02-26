import test from 'ava';
import { transactionBuilder } from '../src';
import { createUmi, transferSol } from './_setup';

test('it can get the size of the transaction to build', (t) => {
  const umi = createUmi();
  const builder = transactionBuilder(umi).add(transferSol(umi));
  t.is(builder.getTransactionSize(), 305);
});

test('it can split instructions by index', (t) => {
  // Given a builder with two instructions.
  const umi = createUmi();
  const instructionA = transferSol(umi);
  const instructionB = transferSol(umi);
  const builder = transactionBuilder(umi).add(instructionA).add(instructionB);

  // When we split the builder by index in the middle.
  const [first, second] = builder.splitByIndex(1);

  // Then we get two builders with the correct instructions.
  t.deepEqual(first.items, [instructionA]);
  t.deepEqual(second.items, [instructionB]);
});

test('it can split instructions by transaction size', (t) => {
  // Given a builder with 100 instructions.
  const umi = createUmi();
  const instructions = Array.from({ length: 100 }).map(() => transferSol(umi));
  const builder = transactionBuilder(umi).add(instructions);

  // When we split the builder by transaction size.
  const builders = builder.unsafeSplitByTransactionSize();

  // Then we get 15 builders such that each fit in one transaction.
  t.is(builders.length, 15);
  builders.forEach((b) => t.true(b.fitsInOneTransaction()));
});

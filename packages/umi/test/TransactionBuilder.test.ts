import test from 'ava';
import { publicKey, transactionBuilder } from '../src';
import { createUmi, mockInstruction, transferSol } from './_setup';

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

test('it can map instructions', (t) => {
  // Given a transaction builder with two instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have no bytes created on chain.
  t.true(builder.items.every((ix) => ix.bytesCreatedOnChain === 0));

  // When we map the instructions to have 10 bytes created on chain.
  const mappedBuilder = builder.mapInstructions((ix) => ({
    ...ix,
    bytesCreatedOnChain: 10,
  }));

  // Then each instruction was updated accordingly.
  t.true(mappedBuilder.items.every((ix) => ix.bytesCreatedOnChain === 10));
});

test('it can add remaining accounts to the latest instruction', (t) => {
  // Given a transaction builder with two instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have only one account meta.
  t.true(builder.items.every((ix) => ix.instruction.keys.length === 1));

  // When we add remaining accounts to the latest instruction.
  const mappedBuilder = builder.addRemainingAccounts([
    {
      pubkey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'),
      isSigner: false,
      isWritable: false,
    },
  ]);

  // Then the last instruction has 3 account metas.
  t.is(mappedBuilder.items[1].instruction.keys.length, 3);

  // And the first instruction still has 1 account meta.
  t.is(mappedBuilder.items[0].instruction.keys.length, 1);
});

test('it can add remaining accounts to a specific instruction', (t) => {
  // Given a transaction builder with three instructions.
  const builder = transactionBuilder()
    .add(mockInstruction())
    .add(mockInstruction())
    .add(mockInstruction());

  // And given all instructions have only one account meta.
  t.true(builder.items.every((ix) => ix.instruction.keys.length === 1));

  // When we add remaining accounts to the second instruction.
  const mappedBuilder = builder.addRemainingAccounts(
    [
      {
        pubkey: publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: publicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'),
        isSigner: false,
        isWritable: false,
      },
    ],
    1
  );

  // Then the second instruction has 3 account metas.
  t.is(mappedBuilder.items[1].instruction.keys.length, 3);

  // And the first and last instructions still have 1 account meta.
  t.is(mappedBuilder.items[0].instruction.keys.length, 1);
  t.is(mappedBuilder.items[2].instruction.keys.length, 1);
});

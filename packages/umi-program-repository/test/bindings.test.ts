import { Program, publicKey } from '@metaplex-foundation/umi';
import test from 'ava';
import { createProgram, createUmi } from './_setup';

test('it can bind a name to another name', async (t) => {
  // Given two registered programs: splToken and splToken2022.
  const umi = createUmi();
  const splTokenProgram: Program = createProgram(
    'splToken',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  );
  const splToken2022Program: Program = createProgram(
    'splToken2022',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
  );
  umi.programs.add(splTokenProgram);
  umi.programs.add(splToken2022Program);
  t.is(umi.programs.get('splToken'), splTokenProgram);
  t.is(umi.programs.get('splToken2022'), splToken2022Program);

  // When we add a binding that uses splToken2022 when requesting splToken.
  umi.programs.bind('splToken', 'splToken2022');

  // Then both program names will resolve to the splToken2022 program.
  t.is(umi.programs.get('splToken'), splToken2022Program);
  t.is(umi.programs.get('splToken2022'), splToken2022Program);
});

test('it can bind a name to another public key', async (t) => {
  // Given two registered programs: splToken and splToken2022.
  const umi = createUmi();
  const splTokenProgram: Program = createProgram(
    'splToken',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  );
  const splToken2022Program: Program = createProgram(
    'splToken2022',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
  );
  umi.programs.add(splTokenProgram);
  umi.programs.add(splToken2022Program);
  t.is(umi.programs.get('splToken'), splTokenProgram);
  t.is(umi.programs.get('splToken2022'), splToken2022Program);

  // When we add a binding that uses the public key of splToken2022 when requesting splToken.
  umi.programs.bind('splToken', splToken2022Program.publicKey);

  // Then both program names will resolve to the splToken2022 program.
  t.is(umi.programs.get('splToken'), splToken2022Program);
  t.is(umi.programs.get('splToken2022'), splToken2022Program);
});

test('the resolved binding has to be a registered program', async (t) => {
  // Given only the splToken program is registered.
  const umi = createUmi();
  const splTokenProgram: Program = createProgram(
    'splToken',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  );
  umi.programs.add(splTokenProgram);
  t.is(umi.programs.get('splToken'), splTokenProgram);

  // And given a binding that uses the public key of splToken2022 when requesting splToken.
  umi.programs.bind(
    'splToken',
    publicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
  );

  // When we try to get the splToken program.
  const fn = () => umi.programs.get('splToken');

  // Then we expect an error to be thrown.
  t.throws(fn, {
    message:
      /The provided program address \[TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb\] is not recognized/,
  });
});

test('it cannot add a binding that creates a circular dependency', async (t) => {
  // Given 2 bindings such that programA resolves to programB which resolves to programC.
  const umi = createUmi();
  umi.programs.bind('programA', 'programB');
  umi.programs.bind('programB', 'programC');

  // When we try to add a third binding that would create a circular dependency.
  const fn = () => umi.programs.bind('programC', 'programA');

  // Then we expect an error to be thrown.
  t.throws(fn, {
    message:
      /Circular binding detected: programC -> programA -> programB -> programC/,
  });
});

test('it can unbind an existing bidding', async (t) => {
  // Given ta binding between two registered programs: splToken and splToken2022.
  const umi = createUmi();
  const splTokenProgram: Program = createProgram(
    'splToken',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  );
  const splToken2022Program: Program = createProgram(
    'splToken2022',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
  );
  umi.programs.add(splTokenProgram);
  umi.programs.add(splToken2022Program);
  umi.programs.bind('splToken', 'splToken2022');
  t.is(umi.programs.get('splToken'), splToken2022Program);
  t.is(umi.programs.get('splToken2022'), splToken2022Program);

  // When we remove the binding.
  umi.programs.unbind('splToken');

  // Then both program names resolve to their original programs.
  t.is(umi.programs.get('splToken'), splTokenProgram);
  t.is(umi.programs.get('splToken2022'), splToken2022Program);
});

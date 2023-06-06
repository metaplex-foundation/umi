import { Program, publicKey } from '@metaplex-foundation/umi';
import test from 'ava';
import { createProgram, createUmi } from './_setup';

test('it can add programs', async (t) => {
  // Given a Program.
  const umi = createUmi();
  const programId = publicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  const program: Program = {
    name: 'myProgram',
    publicKey: programId,
    getErrorFromCode: () => null,
    getErrorFromName: () => null,
    isOnCluster: () => true,
  };

  // When we add it to the default program repository.
  umi.programs.add(program);

  // Then we can assert that it was added.
  t.true(umi.programs.has('myProgram'));
  t.true(umi.programs.has(programId));

  // And we can retrieve it.
  t.is(umi.programs.get('myProgram'), program);
  t.is(umi.programs.get(programId), program);

  // And it is part of the returned array of programs.
  t.deepEqual(umi.programs.all(), [program]);
});

test('it can add programs to specific clusters', async (t) => {
  // Given our Umi instance is on the devnet cluster.
  const umi = createUmi('devnet');

  // And given two variants of a Program, one for mainnet and one for devnet.
  const programId = publicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  const devnetProgram: Program = {
    name: 'myProgram',
    publicKey: programId,
    getErrorFromCode: () => null,
    getErrorFromName: () => null,
    isOnCluster: (cluster) => cluster === 'devnet',
  };
  const mainnetProgram: Program = {
    name: 'myProgram',
    publicKey: programId,
    getErrorFromCode: () => null,
    getErrorFromName: () => null,
    isOnCluster: (cluster) => cluster === 'mainnet-beta',
  };

  // When we add them to the default program repository.
  umi.programs.add(devnetProgram);
  umi.programs.add(mainnetProgram);

  // Then we get the devnet program by default.
  t.is(umi.programs.get('myProgram'), devnetProgram);
  t.is(umi.programs.get(programId), devnetProgram);

  // But we can also request the mainnet program explicitly.
  t.is(umi.programs.get('myProgram', 'mainnet-beta'), mainnetProgram);
  t.is(umi.programs.get(programId, 'mainnet-beta'), mainnetProgram);

  // And only the devnet program is part of the returned array of programs by default.
  t.deepEqual(umi.programs.all(), [devnetProgram]);

  // But both of them are part of the returned array of programs when we request all clusters.
  t.is(umi.programs.all('*').length, 2);
  t.true(umi.programs.all('*').includes(devnetProgram));
  t.true(umi.programs.all('*').includes(mainnetProgram));
});

test('it can ignore adding programs when they are already registered', async (t) => {
  // Given a registered program.
  const umi = createUmi();
  const program = createProgram('myProgram');
  umi.programs.add(program);

  // When we add it again with the `overwrite` flag set to `false`.
  umi.programs.add(program, false);

  // Then it is not added again.
  t.is(umi.programs.all().length, 1);
  t.deepEqual(umi.programs.all(), [program]);
});

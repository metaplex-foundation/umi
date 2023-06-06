import test from 'ava';
import { createProgram, createUmi } from './_setup';

test('it can clone a program repository', async (t) => {
  // Given a program repository with one program registered.
  const umi = createUmi();
  const programA = createProgram('programA');
  umi.programs.add(programA);
  t.is(umi.programs.all().length, 1);

  // When we clone the program repository.
  const clonedPrograms = umi.programs.clone();

  // Then we get a new repository instance with the same programs.
  t.not(clonedPrograms, umi.programs);
  t.is(clonedPrograms.all().length, 1);
  t.deepEqual(clonedPrograms.all(), [programA]);

  // And adding new programs to the cloned repository does not affect the original.
  clonedPrograms.add(createProgram('programB'));
  t.is(clonedPrograms.all().length, 2);
  t.is(umi.programs.all().length, 1);
});

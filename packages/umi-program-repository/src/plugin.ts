import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { DefaultProgramRepository } from './DefaultProgramRepository';

export const defaultProgramRepository = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.programs = new DefaultProgramRepository(metaplex);
  },
});

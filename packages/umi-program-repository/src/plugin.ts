import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { DefaultProgramRepository } from './DefaultProgramRepository';

export const defaultProgramRepository = (): UmiPlugin => ({
  install(umi) {
    umi.programs = new DefaultProgramRepository(umi);
  },
});

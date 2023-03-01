import { UmiPlugin } from '@metaplex-foundation/umi';
import { DefaultProgramRepository } from './DefaultProgramRepository';

export const defaultProgramRepository = (): UmiPlugin => ({
  install(umi) {
    umi.programs = new DefaultProgramRepository(umi);
  },
});

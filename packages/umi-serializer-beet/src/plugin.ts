import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { BeetSerializer } from './BeetSerializer';

export const beetSerializer = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.serializer = new BeetSerializer();
  },
});

import { MetaplexPlugin } from '@lorisleiva/js-core';
import { BeetSerializer } from './BeetSerializer';

export const beetSerializer = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.serializer = new BeetSerializer();
  },
});

import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { FetchHttp } from './FetchHttp';

export const fetchHttp = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.http = new FetchHttp();
  },
});

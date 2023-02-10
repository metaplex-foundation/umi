import { MetaplexPlugin } from '@lorisleiva/js-core';
import { FetchHttp } from './FetchHttp';

export const fetchHttp = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.http = new FetchHttp();
  },
});

import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { FetchHttp } from './FetchHttp';

export const fetchHttp = (): UmiPlugin => ({
  install(umi) {
    umi.http = new FetchHttp();
  },
});

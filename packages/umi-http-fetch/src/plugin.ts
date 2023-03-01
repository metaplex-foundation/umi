import { UmiPlugin } from '@metaplex-foundation/umi';
import { FetchHttp } from './FetchHttp';

export const fetchHttp = (): UmiPlugin => ({
  install(umi) {
    umi.http = new FetchHttp();
  },
});

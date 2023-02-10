import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { HttpDownloader } from './HttpDownloader';

export const httpDownloader = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.downloader = new HttpDownloader(metaplex);
  },
});

import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { HttpDownloader } from './HttpDownloader';

export const httpDownloader = (): UmiPlugin => ({
  install(umi) {
    umi.downloader = new HttpDownloader(umi);
  },
});

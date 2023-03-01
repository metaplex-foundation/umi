import { UmiPlugin } from '@metaplex-foundation/umi';
import { HttpDownloader } from './HttpDownloader';

export const httpDownloader = (): UmiPlugin => ({
  install(umi) {
    umi.downloader = new HttpDownloader(umi);
  },
});

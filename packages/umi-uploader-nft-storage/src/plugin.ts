import type { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import {
  NftStorageUploader,
  NftStorageUploaderOptions,
} from './NftStorageUploader';

export const nftStorageUploader = (
  options?: NftStorageUploaderOptions
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.uploader = new NftStorageUploader(metaplex, options);
  },
});

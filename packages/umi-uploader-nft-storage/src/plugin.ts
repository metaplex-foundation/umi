import type { UmiPlugin } from '@metaplex-foundation/umi-core';
import {
  NftStorageUploader,
  NftStorageUploaderOptions,
} from './NftStorageUploader';

export const nftStorageUploader = (
  options?: NftStorageUploaderOptions
): UmiPlugin => ({
  install(umi) {
    umi.uploader = new NftStorageUploader(umi, options);
  },
});

import type { UmiPlugin } from '@metaplex-foundation/umi';
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

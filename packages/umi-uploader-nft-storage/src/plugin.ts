import type { UmiPlugin } from '@metaplex-foundation/umi';
import {
  createNftStorageUploader,
  NftStorageUploaderOptions,
} from './createNftStorageUploader';

export const nftStorageUploader = (
  options?: NftStorageUploaderOptions
): UmiPlugin => ({
  install(umi) {
    umi.uploader = createNftStorageUploader(umi, options);
  },
});

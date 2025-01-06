import type { UmiPlugin } from '@metaplex-foundation/umi';
import {
  ArweaveUploaderOptions,
  createArweaveUploader,
} from './createArweaveUploader';

export const arweaveUploader = (
  options?: ArweaveUploaderOptions
): UmiPlugin => ({
  install(umi) {
    umi.uploader = createArweaveUploader(umi, options);
  },
});

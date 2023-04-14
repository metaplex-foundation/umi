import type { UmiPlugin } from '@metaplex-foundation/umi';
import {
  BundlrUploaderOptions,
  createBundlrUploader,
} from './createBundlrUploader';

export const bundlrUploader = (options?: BundlrUploaderOptions): UmiPlugin => ({
  install(umi) {
    umi.uploader = createBundlrUploader(umi, options);
  },
});

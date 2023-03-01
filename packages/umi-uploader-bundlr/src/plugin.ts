import type { UmiPlugin } from '@metaplex-foundation/umi';
import { BundlrUploaderOptions, BundlrUploader } from './BundlrUploader';

export const bundlrUploader = (options?: BundlrUploaderOptions): UmiPlugin => ({
  install(umi) {
    umi.uploader = new BundlrUploader(umi, options);
  },
});

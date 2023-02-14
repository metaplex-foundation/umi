import type { UmiPlugin } from '@metaplex-foundation/umi-core';
import { BundlrUploaderOptions, BundlrUploader } from './BundlrUploader';

export const bundlrUploader = (options?: BundlrUploaderOptions): UmiPlugin => ({
  install(umi) {
    umi.uploader = new BundlrUploader(umi, options);
  },
});

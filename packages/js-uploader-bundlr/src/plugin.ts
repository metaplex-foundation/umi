import type { MetaplexPlugin } from '@lorisleiva/js-core';
import { BundlrUploaderOptions, BundlrUploader } from './BundlrUploader';

export const bundlrUploader = (
  options?: BundlrUploaderOptions
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.uploader = new BundlrUploader(metaplex, options);
  },
});

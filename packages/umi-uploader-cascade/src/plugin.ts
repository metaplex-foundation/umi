import type { UmiPlugin } from '@metaplex-foundation/umi';
import {
  createCascadeUploader,
  CascadeUploaderOptions,
} from './createCascadeUploader';

export const cascadeUploader = (
  options?: CascadeUploaderOptions
): UmiPlugin => ({
  install(umi) {
    umi.uploader = createCascadeUploader(umi, options);
  },
});

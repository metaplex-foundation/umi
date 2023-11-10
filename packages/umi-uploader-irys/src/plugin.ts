import type { UmiPlugin } from '@metaplex-foundation/umi';
import { IrysUploaderOptions, createIrysUploader } from './createIrysUploader';

export const irysUploader = (options?: IrysUploaderOptions): UmiPlugin => ({
  install(umi) {
    umi.uploader = createIrysUploader(umi, options);
  },
});

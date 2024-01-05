import { UmiPlugin } from '@metaplex-foundation/umi';
import { createInscriptionUploader, InscriptionUploaderOptions } from './createInscriptionUploader';

export const inscriptionUploader = (options: InscriptionUploaderOptions): UmiPlugin => ({
  install(umi) {
    const inscriptionUploader = createInscriptionUploader(umi, options);
    umi.uploader = inscriptionUploader;
  },
});

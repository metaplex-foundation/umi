import { UmiPlugin } from '@metaplex-foundation/umi';
import {
  create4everlandUploader,
  Credentials,
} from './create4everlandUploader';

export const foreverlandUploader = (
  credential: Credentials,
  bucketName: string
): UmiPlugin => ({
  install(umi) {
    umi.uploader = create4everlandUploader(credential, bucketName);
  },
});

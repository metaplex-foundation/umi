import { S3Client } from '@aws-sdk/client-s3';
import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { AwsUploader } from './AwsUploader';

export const awsUploader = (
  client: S3Client,
  bucketName: string
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.uploader = new AwsUploader(client, bucketName);
  },
});

import { S3Client } from '@aws-sdk/client-s3';
import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { AwsUploader } from './AwsUploader';

export const awsUploader = (
  client: S3Client,
  bucketName: string
): UmiPlugin => ({
  install(umi) {
    umi.uploader = new AwsUploader(client, bucketName);
  },
});

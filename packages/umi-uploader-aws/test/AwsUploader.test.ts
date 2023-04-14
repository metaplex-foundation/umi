import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createGenericFile, utf8 } from '@metaplex-foundation/umi';
import test from 'ava';
import sinon from 'sinon';
import { createAwsUploader } from '../src';

const awsClient = {
  async send() {
    return {};
  },
  config: {
    async region() {
      return 'us-east';
    },
  },
} as unknown as S3Client;

test('it can upload assets to a S3 bucket', async (t) => {
  // Given a mock awsClient.
  const stub = sinon.spy(awsClient);

  // Fed to a AwsUploader.
  const uploader = createAwsUploader(awsClient, 'some-bucket');

  // When we upload some content to AWS S3.
  const file = createGenericFile('some-image', 'some-image.jpg', {
    uniqueName: 'some-key',
  });
  const [uri] = await uploader.upload([file]);

  // Then we get the URL of the uploaded asset.
  t.is(uri, 'https://s3.us-east.amazonaws.com/some-bucket/some-key');
  t.assert(stub.send.calledOnce);
  const command = stub.send.getCall(0).args[0] as PutObjectCommand;
  t.assert(command instanceof PutObjectCommand);
  t.is(command.input.Bucket, 'some-bucket');
  t.is(command.input.Key, 'some-key');
  t.is(utf8.deserialize(command.input.Body as Uint8Array)[0], 'some-image');
});

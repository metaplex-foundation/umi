import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  createGenericFileFromJson,
  GenericFile,
  lamports,
  SolAmount,
  UploaderInterface,
} from '@metaplex-foundation/umi';

export function createAwsUploader(
  client: S3Client,
  bucketName: string
): UploaderInterface & { getUrl: (key: string) => Promise<string> } {
  const uploadOne = async (file: GenericFile): Promise<string> => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: file.uniqueName,
      Body: file.buffer,
      ContentType: file.contentType || undefined,
    });

    await client.send(command);

    return getUrl(file.uniqueName);
  };

  const upload = async (files: GenericFile[]): Promise<string[]> =>
    Promise.all(files.map((file) => uploadOne(file)));

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  const getUploadPrice = async (): Promise<SolAmount> => lamports(0);

  const getUrl = async (key: string) => {
    const region = await client.config.region();
    const encodedKey = encodeURIComponent(key);

    return `https://s3.${region}.amazonaws.com/${bucketName}/${encodedKey}`;
  };

  return {
    upload,
    uploadJson,
    getUploadPrice,
    getUrl,
  };
}

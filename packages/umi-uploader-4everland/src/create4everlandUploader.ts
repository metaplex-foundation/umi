import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import {
  createGenericFileFromJson,
  GenericFile,
  lamports,
  SolAmount,
  UploaderInterface,
} from '@metaplex-foundation/umi';

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export function create4everlandUploader(
  credentials: Credentials,
  bucketName: string
): UploaderInterface {
  const client = new S3Client({
    endpoint: 'https://endpoint.4everland.co',
    credentials,
    region: 'eu-west-2',
  });

  const uploadOne = async (file: GenericFile): Promise<string> => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: file.uniqueName,
      Body: file.buffer,
      ContentType: file.contentType || undefined,
    });

    const data = await client.send(command);
    const headerCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: file.uniqueName,
    });
    const headerData = await client.send(headerCommand);
    const metadata = headerData.Metadata!;
    const arHash = metadata['arweave-hash'];
    if (arHash) return arHash;
    let hash = '';
    if (data.ETag) {
      hash = JSON.parse(data.ETag);
    }
    return hash;
  };

  const upload = async (files: GenericFile[]): Promise<string[]> =>
    Promise.all(files.map((file) => uploadOne(file)));

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  const getUploadPrice = async (): Promise<SolAmount> => lamports(0);

  return {
    upload,
    uploadJson,
    getUploadPrice,
  };
}

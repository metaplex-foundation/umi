import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  createGenericFileFromJson,
  GenericFile,
  lamports,
  SolAmount,
  UploaderInterface,
} from '@metaplex-foundation/umi';

export class AwsUploader implements UploaderInterface {
  protected client: S3Client;

  protected bucketName: string;

  constructor(client: S3Client, bucketName: string) {
    this.client = client;
    this.bucketName = bucketName;
  }

  async uploadOne(file: GenericFile): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: file.uniqueName,
      Body: file.buffer,
      ContentType: file.contentType || undefined,
    });

    await this.client.send(command);

    return this.getUrl(file.uniqueName);
  }

  async upload(files: GenericFile[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadOne(file)));
  }

  async uploadJson<T>(json: T): Promise<string> {
    const file = createGenericFileFromJson(json);
    const uris = await this.upload([file]);
    return uris[0];
  }

  async getUploadPrice(): Promise<SolAmount> {
    return lamports(0);
  }

  async getUrl(key: string) {
    const region = await this.client.config.region();
    const encodedKey = encodeURIComponent(key);

    return `https://s3.${region}.amazonaws.com/${this.bucketName}/${encodedKey}`;
  }
}

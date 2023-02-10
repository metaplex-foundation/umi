import {
  createGenericFileFromJson,
  DownloaderInterface,
  GenericFile,
  parseJsonFromGenericFile,
  sol,
  SolAmount,
  UploaderInterface,
} from '@lorisleiva/js-core';
import { AssetNotFoundError } from './errors';

const DEFAULT_BASE_URL = 'https://mockstorage.example.com/';

export type MockStorageOptions = {
  baseUrl?: string;
};

export class MockStorage implements UploaderInterface, DownloaderInterface {
  protected cache: Record<string, GenericFile> = {};

  public readonly baseUrl: string;

  constructor(options?: MockStorageOptions) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  }

  async uploadOne(file: GenericFile): Promise<string> {
    const uri = `${this.baseUrl}${file.uniqueName}`;
    this.cache[uri] = file;

    return uri;
  }

  async upload(files: GenericFile[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadOne(file)));
  }

  async uploadJson<T>(json: T): Promise<string> {
    return this.uploadOne(createGenericFileFromJson<T>(json));
  }

  async getUploadPrice(): Promise<SolAmount> {
    return sol(0);
  }

  async downloadOne(uri: string): Promise<GenericFile> {
    const file = this.cache[uri];

    if (!file) {
      throw new AssetNotFoundError(uri);
    }

    return file;
  }

  async download(uris: string[]): Promise<GenericFile[]> {
    return Promise.all(uris.map((uri) => this.downloadOne(uri)));
  }

  async downloadJson<T>(uri: string): Promise<T> {
    return parseJsonFromGenericFile<T>(await this.downloadOne(uri));
  }
}

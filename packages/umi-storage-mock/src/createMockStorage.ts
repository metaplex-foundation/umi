import {
  createGenericFileFromJson,
  DownloaderInterface,
  GenericFile,
  parseJsonFromGenericFile,
  sol,
  SolAmount,
  UploaderInterface,
} from '@metaplex-foundation/umi';
import { AssetNotFoundError } from './errors';

const DEFAULT_BASE_URL = 'https://mockstorage.example.com/';

export type MockStorageOptions = {
  baseUrl?: string;
};

export function createMockStorage(
  options?: MockStorageOptions
): UploaderInterface & DownloaderInterface {
  const cache: Record<string, GenericFile> = {};
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;

  const uploadOne = async (file: GenericFile): Promise<string> => {
    const uri = `${baseUrl}${file.uniqueName}`;
    cache[uri] = file;

    return uri;
  };

  const upload = async (files: GenericFile[]): Promise<string[]> =>
    Promise.all(files.map((file) => uploadOne(file)));

  const uploadJson = async <T>(json: T): Promise<string> =>
    uploadOne(createGenericFileFromJson<T>(json));

  const getUploadPrice = async (): Promise<SolAmount> => sol(0);

  const downloadOne = async (uri: string): Promise<GenericFile> => {
    const file = cache[uri];

    if (!file) {
      throw new AssetNotFoundError(uri);
    }

    return file;
  };

  const download = async (uris: string[]): Promise<GenericFile[]> =>
    Promise.all(uris.map((uri) => downloadOne(uri)));

  const downloadJson = async <T>(uri: string): Promise<T> =>
    parseJsonFromGenericFile<T>(await downloadOne(uri));

  return {
    upload,
    uploadJson,
    getUploadPrice,
    download,
    downloadJson,
  };
}

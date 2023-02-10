import { InterfaceImplementationMissingError } from './errors';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type { GenericFile } from './GenericFile';

export interface DownloaderInterface {
  download: (
    uris: string[],
    options?: DownloaderOptions
  ) => Promise<GenericFile[]>;

  downloadJson: <T>(uri: string, options?: DownloaderOptions) => Promise<T>;
}

export type DownloaderOptions = {
  signal?: GenericAbortSignal;
};

export class NullDownloader implements DownloaderInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'DownloaderInterface',
    'downloader'
  );

  download(): Promise<GenericFile[]> {
    throw this.error;
  }

  downloadJson<T>(): Promise<T> {
    throw this.error;
  }
}

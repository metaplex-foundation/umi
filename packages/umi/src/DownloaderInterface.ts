import { InterfaceImplementationMissingError } from './errors';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type { GenericFile } from './GenericFile';

/**
 * TODO
 *
 * @category Interfaces
 */
export interface DownloaderInterface {
  download: (
    uris: string[],
    options?: DownloaderOptions
  ) => Promise<GenericFile[]>;

  downloadJson: <T>(uri: string, options?: DownloaderOptions) => Promise<T>;
}

/**
 * TODO
 *
 * @category Interfaces — Downloader
 */
export type DownloaderOptions = {
  signal?: GenericAbortSignal;
};

/**
 * TODO
 *
 * @category Interfaces — Downloader
 */
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

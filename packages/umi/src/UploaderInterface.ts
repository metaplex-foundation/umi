import type { Amount } from './Amount';
import { InterfaceImplementationMissingError } from './errors';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type { GenericFile } from './GenericFile';

/**
 * Defines the interface for an uploader.
 * It allows us to upload files and get their URIs.
 *
 * @category Interfaces
 */
export interface UploaderInterface {
  /** Uploads multiple files and returns their URIs. */
  upload: (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ) => Promise<string[]>;

  /** Uploads a JSON object and returns its URI. */
  uploadJson: <T>(json: T, options?: UploaderUploadOptions) => Promise<string>;

  /** Gets the price to upload a list of files. */
  getUploadPrice: (
    files: GenericFile[],
    options?: UploaderGetUploadPriceOptions
  ) => Promise<Amount>;
}

/**
 * The options that can be passed when fetching the upload price.
 * @category Uploader
 */
export type UploaderGetUploadPriceOptions = {
  signal?: GenericAbortSignal;
};

/**
 * The options that can be passed when uploading files.
 * @category Uploader
 */
export type UploaderUploadOptions = {
  onProgress?: (percent: number, ...args: any) => void;
  signal?: GenericAbortSignal;
};

/**
 * An implementation of the {@link UploaderInterface} that throws an error when called.
 * @category Uploader
 */
export class NullUploader implements UploaderInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'UploaderInterface',
    'uploader'
  );

  upload(): Promise<string[]> {
    throw this.error;
  }

  uploadJson(): Promise<string> {
    throw this.error;
  }

  getUploadPrice(): Promise<Amount> {
    throw this.error;
  }
}

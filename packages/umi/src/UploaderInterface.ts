import type { Amount } from './Amount';
import { InterfaceImplementationMissingError } from './errors';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type { GenericFile } from './GenericFile';

/**
 * TODO
 *
 * @category Interfaces
 */
export interface UploaderInterface {
  upload: (
    files: GenericFile[],
    options?: UploaderUploadOptions
  ) => Promise<string[]>;

  uploadJson: <T>(json: T, options?: UploaderUploadOptions) => Promise<string>;

  getUploadPrice: (
    files: GenericFile[],
    options?: UploaderGetUploadPriceOptions
  ) => Promise<Amount>;
}

export type UploaderGetUploadPriceOptions = {
  signal?: GenericAbortSignal;
};

export type UploaderUploadOptions = {
  onProgress?: (percent: number, ...args: any) => void;
  signal?: GenericAbortSignal;
};

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

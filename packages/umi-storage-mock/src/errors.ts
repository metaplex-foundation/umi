import { SdkError } from '@metaplex-foundation/umi';

/** @group Errors */
export class AssetNotFoundError extends SdkError {
  readonly name: string = 'AssetNotFoundError';

  constructor(location: string) {
    super(`The asset at [${location}] could not be found.`);
  }
}

import { UmiError } from '@metaplex-foundation/umi';

export class BundlrError extends UmiError {
  readonly name: string = 'BundlrError';

  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Bundlr', cause);
  }
}

export class FailedToInitializeBundlrError extends BundlrError {
  readonly name: string = 'FailedToInitializeBundlrError';

  constructor(cause: Error) {
    const message =
      'Bundlr could not be initialized. ' +
      'Please check the underlying error below for more details.';
    super(message, cause);
  }
}

export class FailedToConnectToBundlrAddressError extends BundlrError {
  readonly name: string = 'FailedToConnectToBundlrAddressError';

  constructor(address: string, cause: Error) {
    const message =
      `Bundlr could not connect to the provided address [${address}]. ` +
      'Please ensure the provided address is valid. Some valid addresses include: ' +
      '"https://node1.bundlr.network" for mainnet and "https://devnet.bundlr.network" for devnet';
    super(message, cause);
  }
}

export class AssetUploadFailedError extends BundlrError {
  readonly name: string = 'AssetUploadFailedError';

  constructor(status: number) {
    const message =
      `The asset could not be uploaded to the Bundlr network and ` +
      `returned the following status code [${status}].`;
    super(message);
  }
}

export class BundlrWithdrawError extends BundlrError {
  readonly name: string = 'BundlrWithdrawError';

  constructor(status: number) {
    const message =
      `The balance could not be withdrawn from the Bundlr network and ` +
      `returned the following status code [${status}].`;
    super(message);
  }
}

import { UmiError } from '@metaplex-foundation/umi';

export class ArweaveError extends UmiError {
  readonly name: string = 'ArweaveError';

  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Arweave', cause);
  }
}

export class FailedToInitializeArweaveError extends ArweaveError {
  readonly name: string = 'FailedToInitializeArweaveError';

  constructor(cause: Error) {
    const message =
      'Arweave could not be initialized. ' +
      'Please check the underlying error below for more details.';
    super(message, cause);
  }
}

export class FailedToConnectToArweaveAddressError extends ArweaveError {
  readonly name: string = 'FailedToConnectToArweaveAddressError';

  constructor(
    uploadServiceUrl: string,
    paymentServiceUrl: string,
    cause: Error
  ) {
    const message =
      `Arweave could not connect to the provided addresses [${uploadServiceUrl}, ${paymentServiceUrl}]. ` +
      'Please ensure the provided address is valid. Some valid addresses include: ' +
      '"https://upload.ardrive.io" and "https://payment.ardrive.io" for mainnet ';
    super(message, cause);
  }
}

export class AssetUploadFailedError extends ArweaveError {
  readonly name: string = 'AssetUploadFailedError';

  constructor(error: unknown) {
    const message = `The asset could not be uploaded to the Arweave network: ${error}`;
    super(message);
  }
}

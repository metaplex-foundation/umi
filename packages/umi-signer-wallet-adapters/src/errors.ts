import { UmiError } from '@metaplex-foundation/umi';

export class WalletAdaptersError extends UmiError {
  readonly name: string = 'WalletAdaptersError';

  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Wallet Adapters', cause);
  }
}

export class UninitializedWalletAdapterError extends WalletAdaptersError {
  readonly name: string = 'UninitializedWalletAdapterError';

  constructor() {
    const message =
      `The current wallet adapter is not initialized. ` +
      'You likely have selected a wallet adapter but forgot to initialize it. ' +
      'You may do this by running the following asynchronous method: "wallet.connect();".';
    super(message);
  }
}

export class OperationNotSupportedByWalletAdapterError extends WalletAdaptersError {
  readonly name: string = 'OperationNotSupportedByWalletAdapterError';

  constructor(operation: string) {
    const message =
      `The current wallet adapter does not support the following operation: [${operation}]. ` +
      'Ensure your wallet is connected using a compatible wallet adapter.';
    super(message);
  }
}

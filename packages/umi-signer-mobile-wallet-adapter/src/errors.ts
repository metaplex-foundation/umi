export class UninitializedMobileWalletError extends Error {
  constructor() {
    super('Mobile wallet adapter is not initialized. You must connect to a wallet first.');
    this.name = 'UninitializedMobileWalletError';
  }
}

export class MobileWalletSigningError extends Error {
  constructor(operation: string) {
    super(`Failed to ${operation} using mobile wallet adapter.`);
    this.name = 'MobileWalletSigningError';
  }
} 
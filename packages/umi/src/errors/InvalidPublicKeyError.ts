/** @category Errors */
export class InvalidPublicKeyError extends Error {
  readonly name: string = 'InvalidPublicKeyError';

  readonly invalidPublicKey: unknown;

  constructor(invalidPublicKey: unknown) {
    super(`The provided public key is invalid: ${invalidPublicKey}`);
    this.invalidPublicKey = invalidPublicKey;
  }
}

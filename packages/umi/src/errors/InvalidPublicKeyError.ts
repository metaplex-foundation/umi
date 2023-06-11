/** @category Errors */
export class InvalidPublicKeyError extends Error {
  readonly name: string = 'InvalidPublicKeyError';

  readonly invalidPublicKey: unknown;

  constructor(invalidPublicKey: unknown, reason?: string) {
    reason = reason ? `. ${reason}` : '';
    super(`The provided public key is invalid: ${invalidPublicKey}${reason}`);
    this.invalidPublicKey = invalidPublicKey;
  }
}

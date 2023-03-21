import { base58PublicKey, PublicKey } from '../PublicKey';
import { SdkError } from './SdkError';

/** @category Errors */
export class AccountNotFoundError extends SdkError {
  readonly name: string = 'AccountNotFoundError';

  constructor(publicKey: PublicKey, accountType?: string, solution?: string) {
    const message = `${
      accountType
        ? `The account of type [${accountType}] was not found`
        : 'No account was found'
    } at the provided address [${base58PublicKey(publicKey)}].${
      solution ? ` ${solution}` : ''
    }`;
    super(message);
  }
}

import { MetaplexError } from './MetaplexError';

/** @group Errors */
export class SdkError extends MetaplexError {
  readonly name: string = 'SdkError';

  constructor(message: string, cause?: Error) {
    super(message, 'sdk', undefined, cause);
  }
}

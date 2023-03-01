import { UmiError } from './UmiError';

/** @group Errors */
export class SdkError extends UmiError {
  readonly name: string = 'SdkError';

  constructor(message: string, cause?: Error) {
    super(message, 'sdk', undefined, cause);
  }
}

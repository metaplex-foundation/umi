import { SdkError } from './SdkError';

/** @group Errors */
export class InvalidBaseStringError extends SdkError {
  readonly name: string = 'InvalidBaseStringError';

  constructor(value: string, base: number) {
    const message = `Expected a string of base ${base}, got [${value}].`;
    super(message);
  }
}

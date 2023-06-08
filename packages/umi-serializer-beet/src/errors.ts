import { UmiError } from '@metaplex-foundation/umi';

/** @category Errors */
export class BeetSerializerError extends UmiError {
  readonly name: string = 'BeetSerializerError';

  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Beet Serializer', cause);
  }
}

export class OperationNotSupportedError extends BeetSerializerError {
  readonly name: string = 'OperationNotSupportedError';

  constructor(operation: string) {
    super(
      `The operation [${operation}] is ` +
        `not supported by the Beet Serializer.`
    );
  }
}

export class DeserializingEmptyBufferError<
  TDefaultValue = undefined
> extends BeetSerializerError {
  readonly name: string = 'DeserializingEmptyBufferError';

  readonly toleratedDefaultValue: TDefaultValue;

  constructor(serializer: string, toleratedDefaultValue?: TDefaultValue) {
    super(`Serializer [${serializer}] cannot deserialize empty buffers.`);
    this.toleratedDefaultValue = toleratedDefaultValue as TDefaultValue;
  }
}

export class NotEnoughBytesError extends BeetSerializerError {
  readonly name: string = 'NotEnoughBytesError';

  constructor(serializer: string, expected: bigint | number, actual: number) {
    super(
      `Serializer [${serializer}] expected ${expected} bytes, got ${actual}.`
    );
  }
}

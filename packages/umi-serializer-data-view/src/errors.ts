import { UmiError } from '@metaplex-foundation/umi';

/** @category Errors */
export class DataViewSerializerError extends UmiError {
  readonly name: string = 'DataViewSerializerError';

  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'DataView Serializer', cause);
  }
}

export class OperationNotSupportedError extends DataViewSerializerError {
  readonly name: string = 'OperationNotSupportedError';

  constructor(operation: string) {
    super(
      `The operation [${operation}] is ` +
        `not supported by the DataView Serializer.`
    );
  }
}

export class DeserializingEmptyBufferError extends DataViewSerializerError {
  readonly name: string = 'DeserializingEmptyBufferError';

  constructor(serializer: string) {
    super(`Serializer [${serializer}] cannot deserialize empty buffers.`);
  }
}

export class NotEnoughBytesError extends DataViewSerializerError {
  readonly name: string = 'NotEnoughBytesError';

  constructor(serializer: string, expected: number, actual: number) {
    super(
      `Serializer [${serializer}] expected ${expected} bytes, got ${actual}.`
    );
  }
}

export class NumberOutOfRangeError extends DataViewSerializerError {
  readonly name: string = 'NumberOutOfRangeError';

  constructor(
    serializer: string,
    min: number | bigint,
    max: number | bigint,
    actual: number | bigint
  ) {
    super(
      `Serializer [${serializer}] expected number to be between ${min} and ${max}, got ${actual}.`
    );
  }
}

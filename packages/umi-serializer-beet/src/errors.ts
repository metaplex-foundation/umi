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

export class DeserializingEmptyBufferError extends BeetSerializerError {
  readonly name: string = 'DeserializingEmptyBufferError';

  constructor(serializer: string) {
    super(`Serializer [${serializer}] cannot deserialize empty buffers.`);
  }
}

export class NotEnoughBytesError extends BeetSerializerError {
  readonly name: string = 'NotEnoughBytesError';

  constructor(serializer: string, expected: number, actual: number) {
    super(
      `Serializer [${serializer}] expected ${expected} bytes, got ${actual}.`
    );
  }
}

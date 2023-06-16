export class DeserializingEmptyBufferError extends Error {
  readonly name: string = 'DeserializingEmptyBufferError';

  constructor(serializer: string) {
    super(`Serializer [${serializer}] cannot deserialize empty buffers.`);
  }
}

export class NotEnoughBytesError extends Error {
  readonly name: string = 'NotEnoughBytesError';

  constructor(
    serializer: string,
    expected: bigint | number,
    actual: bigint | number
  ) {
    super(
      `Serializer [${serializer}] expected ${expected} bytes, got ${actual}.`
    );
  }
}

/* eslint-disable import/no-extraneous-dependencies */
import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { Assertions } from 'ava';

export const assertValid = <T>(
  t: Assertions,
  serializer: Serializer<T>,
  number: T,
  bytes: string,
  deserializedNumber?: T
): void => {
  // Serialize.
  const actualBytes = serializer.serialize(number);
  const [actualBytesBase16] = base16.deserialize(actualBytes);
  t.is(actualBytesBase16, bytes);
  // Deserialize.
  const deserialization = serializer.deserialize(actualBytes);
  t.is(deserialization[0], deserializedNumber ?? number);
  t.is(deserialization[1], actualBytes.length);
  // Deserialize with offset.
  const deserializationWithOffset = serializer.deserialize(
    base16.serialize(`ffffff${bytes}`),
    3
  );
  t.is(deserializationWithOffset[0], deserializedNumber ?? number);
  t.is(deserializationWithOffset[1], actualBytes.length + 3);
};

export const assertRangeError = <T>(
  t: Assertions,
  serializer: Serializer<T>,
  number: T
): void => {
  t.throws(() => serializer.serialize(number), {
    name: 'NumberOutOfRangeError',
  });
};

/** Assert serialization using a hex string. */
export const s = <T, U extends T = T>(
  t: Assertions,
  serializer: Serializer<T, U>,
  value: T extends T ? T : never,
  expected: string
): void => {
  const [actual] = base16.deserialize(serializer.serialize(value));
  t.is(actual, expected);
};

/** Assert deserialization using a hex string. */
export const d = <T, U extends T = T>(
  t: Assertions,
  serializer: Serializer<T, U>,
  hexBytes: string | [string, number],
  expected: U,
  expectedOffset?: number
): void => {
  const [resolvedHexBytes, offset] = Array.isArray(hexBytes)
    ? hexBytes
    : [hexBytes, undefined];
  const bytes = base16.serialize(resolvedHexBytes);
  const [actual, newOffset] = serializer.deserialize(bytes, offset);
  t.deepEqual(actual, expected);
  if (expectedOffset !== undefined) {
    t.is(newOffset, expectedOffset);
  }
};

export const base16: Serializer<string> = {
  description: 'base16',
  fixedSize: null,
  maxSize: null,
  serialize(value: string) {
    const lowercaseValue = value.toLowerCase();
    if (!lowercaseValue.match(/^[0123456789abcdef]*$/)) {
      throw new Error('Invalid base16 string');
    }
    const matches = lowercaseValue.match(/.{1,2}/g);
    return Uint8Array.from(
      matches ? matches.map((byte: string) => parseInt(byte, 16)) : []
    );
  },
  deserialize(buffer, offset = 0) {
    const value = buffer
      .slice(offset)
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    return [value, buffer.length];
  },
};

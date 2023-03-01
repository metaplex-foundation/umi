/* eslint-disable import/no-extraneous-dependencies */
import { base16, Serializer } from '@metaplex-foundation/umi';
import { Assertions } from 'ava';

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

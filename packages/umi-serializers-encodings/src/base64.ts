import type { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { InvalidBaseStringError } from './errors';

/**
 * A string serializer that uses base64 encoding.
 * @category Serializers
 */
export const base64: Serializer<string> = {
  description: 'base64',
  fixedSize: null,
  maxSize: null,
  serialize(value: string) {
    try {
      return new Uint8Array(
        atob(value)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
    } catch (e) {
      throw new InvalidBaseStringError(value, 64, e as Error);
    }
  },
  deserialize(buffer, offset = 0) {
    const slice = buffer.slice(offset);
    const value = btoa(String.fromCharCode(...slice));
    return [value, buffer.length];
  },
};

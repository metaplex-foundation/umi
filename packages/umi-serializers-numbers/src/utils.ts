import {
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
} from '@metaplex-foundation/umi-serializers-core';
import { NumberOutOfRangeError } from './errors';

/**
 * Helper function to ensure that the array buffer is converted properly from a uint8array
 * Source: https://stackoverflow.com/questions/37228285/uint8array-to-arraybuffer
 * @param {Uint8Array} array Uint8array that's being converted into an array buffer
 * @returns {ArrayBuffer} An array buffer that's necessary to construct a data view
 */
export const toArrayBuffer = (array: Uint8Array): ArrayBuffer =>
  array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);

export const toDataView = (array: Uint8Array): DataView =>
  new DataView(toArrayBuffer(array));

export const assertRange = (
  serializer: string,
  min: number | bigint,
  max: number | bigint,
  value: number | bigint
) => {
  if (value < min || value > max) {
    throw new NumberOutOfRangeError(serializer, min, max, value);
  }
};

export const assertEnoughBytes = (
  serializer: string,
  bytes: Uint8Array,
  expected: number
) => {
  if (bytes.length === 0) {
    throw new DeserializingEmptyBufferError(serializer);
  }
  if (bytes.length < expected) {
    throw new NotEnoughBytesError(serializer, expected, bytes.length);
  }
};

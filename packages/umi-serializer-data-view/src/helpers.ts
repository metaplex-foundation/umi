/**
 * Helper function to ensure that the array buffer is converted properly from a uint8array
 * Source: https://stackoverflow.com/questions/37228285/uint8array-to-arraybuffer
 * @param {Uint8Array} array Uint8array that's being converted into an array buffer
 * @returns {ArrayBuffer} An array buffer that's necessary to construct a data view
 */
export function UInt8ArrayToBuffer(array: Uint8Array): ArrayBuffer {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset
  );
}

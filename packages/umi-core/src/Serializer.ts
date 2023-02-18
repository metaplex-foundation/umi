import { SdkError } from './errors';

/**
 * An object that can serialize and deserialize a value to and from a `Uint8Array`.
 * It supports serializing looser types than it deserializes for convenience.
 * For example, a `bigint` serializer will always deserialize to a `bigint`
 * but can be used to serialize a `number`.
 *
 * @typeParam From - The type of the value to serialize.
 * @typeParam To - The type of the deserialized value. Defaults to `From`.
 */
export type Serializer<From, To extends From = From> = {
  /** A description for the serializer. */
  description: string;
  /** The fixed size of the serialized value in bytes, or `null` if it is variable. */
  fixedSize: number | null;
  /** The maximum size a serialized value can be in bytes, or `null` if it is variable. */
  maxSize: number | null;
  /** The function that serializes a value into bytes. */
  serialize: (value: From) => Uint8Array;
  /**
   * The function that deserializes a value from bytes.
   * It returns the deserialized value and the number of bytes read.
   */
  deserialize: (buffer: Uint8Array, offset?: number) => [To, number];
};

export type NumberSerializer =
  | Serializer<number>
  | Serializer<number | bigint, bigint>;

export type WrapInSerializer<T, U extends T = T> = {
  [P in keyof T]: Serializer<T[P], U[P]>;
};

export function mapSerializer<NewFrom, OldFrom, To extends NewFrom & OldFrom>(
  serializer: Serializer<OldFrom, To>,
  unmap: (value: NewFrom) => OldFrom
): Serializer<NewFrom, To>;
export function mapSerializer<
  NewFrom,
  OldFrom,
  NewTo extends NewFrom = NewFrom,
  OldTo extends OldFrom = OldFrom
>(
  serializer: Serializer<OldFrom, OldTo>,
  unmap: (value: NewFrom) => OldFrom,
  map: (value: OldTo, buffer: Uint8Array, offset: number) => NewTo
): Serializer<NewFrom, NewTo>;
export function mapSerializer<
  NewFrom,
  OldFrom,
  NewTo extends NewFrom = NewFrom,
  OldTo extends OldFrom = OldFrom
>(
  serializer: Serializer<OldFrom, OldTo>,
  unmap: (value: NewFrom) => OldFrom,
  map?: (value: OldTo, buffer: Uint8Array, offset: number) => NewTo
): Serializer<NewFrom, NewTo> {
  return {
    description: serializer.description,
    fixedSize: serializer.fixedSize,
    maxSize: serializer.maxSize,
    serialize: (value: NewFrom) => serializer.serialize(unmap(value)),
    deserialize: (buffer: Uint8Array, offset = 0) => {
      const [value, length] = serializer.deserialize(buffer, offset);
      return map
        ? [map(value, buffer, offset), length]
        : [value as any, length];
    },
  };
}

/**
 * Creates a fixed-size serializer from a given serializer.
 *
 * @param serializer - The serializer to wrap into a fixed-size serializer.
 * @param fixedBytes - The fixed number of bytes to read.
 * @param description - A custom description for the serializer.
 */
export function fixSerializer<T, U extends T = T>(
  serializer: Serializer<T, U>,
  fixedBytes: number,
  description?: string
): Serializer<T, U> {
  return {
    description:
      description ?? `fixed(${fixedBytes}, ${serializer.description})`,
    fixedSize: fixedBytes,
    maxSize: fixedBytes,
    serialize: (value: T) => {
      const buffer = new Uint8Array(fixedBytes).fill(0);
      buffer.set(serializer.serialize(value).slice(0, fixedBytes));
      return buffer;
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      bytes = bytes.slice(offset, offset + fixedBytes);
      if (bytes.length < fixedBytes) {
        throw new SdkError(
          `Fixed serializer expected ${fixedBytes} bytes, got ${bytes.length}.`
        );
      }
      const [value] = serializer.deserialize(bytes, offset);
      return [value, offset + fixedBytes];
    },
  };
}

export function swapSerializerEndianness<T, U extends T = T>(
  serializer: Serializer<T, U>,
  bytesPerWord = 8
): Serializer<T, U> {
  return {
    ...serializer,
    serialize: (value: T) =>
      swapEndianness(serializer.serialize(value), bytesPerWord),
    deserialize: (bytes: Uint8Array, offset = 0) =>
      serializer.deserialize(swapEndianness(bytes, bytesPerWord), offset),
  };
}

export function swapEndianness(
  bytes: Uint8Array,
  bytesPerWord = 8
): Uint8Array {
  bytesPerWord = Math.max(bytesPerWord, 1);
  let newBytes = new Uint8Array(0);

  for (let i = 0; i < bytes.length; i += bytesPerWord) {
    const chunk = bytes.slice(i, i + bytesPerWord);
    newBytes = new Uint8Array([...newBytes, ...chunk.reverse()]);
  }

  return newBytes;
}

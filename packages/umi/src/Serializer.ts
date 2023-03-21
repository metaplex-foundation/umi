import { SdkError } from './errors';
import { mergeBytes } from './utils';

/**
 * An object that can serialize and deserialize a value to and from a `Uint8Array`.
 * It supports serializing looser types than it deserializes for convenience.
 * For example, a `bigint` serializer will always deserialize to a `bigint`
 * but can be used to serialize a `number`.
 *
 * @typeParam From - The type of the value to serialize.
 * @typeParam To - The type of the deserialized value. Defaults to `From`.
 *
 * @category Serializers
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

/**
 * Defines a serializer for numbers and bigints.
 * @category Serializers
 */
export type NumberSerializer =
  | Serializer<number>
  | Serializer<number | bigint, bigint>;

/**
 * Wraps all the attributes of an object in serializers.
 * @category Serializers
 */
export type WrapInSerializer<T, U extends T = T> = {
  [P in keyof T]: Serializer<T[P], U[P]>;
};

/**
 * Converts a serializer A to a serializer B by mapping their values.
 * @category Serializers
 */
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
 *
 * @category Serializers
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
      const [value] = serializer.deserialize(bytes, 0);
      return [value, offset + fixedBytes];
    },
  };
}

/**
 * Reverses the bytes of a fixed-size serializer.
 * @category Serializers
 */
export function reverseSerializer<T, U extends T = T>(
  serializer: Serializer<T, U>
): Serializer<T, U> {
  if (serializer.fixedSize === null) {
    throw new SdkError('Cannot reverse a serializer of variable size.');
  }
  return {
    ...serializer,
    serialize: (value: T) => serializer.serialize(value).reverse(),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const fixedSize = serializer.fixedSize as number;
      const newBytes = mergeBytes([
        bytes.slice(0, offset),
        bytes.slice(offset, offset + fixedSize).reverse(),
        bytes.slice(offset + fixedSize),
      ]);
      return serializer.deserialize(newBytes, offset);
    },
  };
}

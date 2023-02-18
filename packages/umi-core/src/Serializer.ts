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
 * @param bytes - The fixed number of bytes to read.
 * @param child - The serializer to wrap into a fixed-size serializer.
 * @param description - A custom description for the serializer.
 */
// TODO
// export const fixSerializer = <T, U extends T = T>(
//   bytes: number,
//   child: Serializer<T, U>,
//   description?: string
// ): Serializer<T, U> => {
//   // TODO
// };

export const swapEndianness = (buffer: Uint8Array, bytes = 8): Uint8Array => {
  bytes = Math.max(bytes, 1);
  let newBuffer = new Uint8Array(0);

  for (let i = 0; i < buffer.length; i += bytes) {
    const chunk = buffer.slice(i, i + bytes);
    newBuffer = new Uint8Array([...newBuffer, ...chunk.reverse()]);
  }

  return newBuffer;
};

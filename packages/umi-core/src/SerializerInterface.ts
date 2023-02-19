import { DataEnum, ScalarEnum } from './Enums';
import { InterfaceImplementationMissingError } from './errors';
import type { PublicKey, PublicKeyInput } from './PublicKey';
import type {
  NumberSerializer,
  Serializer,
  WrapInSerializer,
} from './Serializer';
import type { Nullable, Option } from './Option';

export interface SerializerInterface {
  /**
   * Creates a serializer for a tuple-like array.
   *
   * @param items - The serializers to use for each item in the tuple.
   * @param options - A set of options for the serializer.
   */
  tuple: <T extends any[], U extends T = T>(
    items: WrapInSerializer<[...T], [...U]>,
    options?: TupleSerializerOptions
  ) => Serializer<T, U>;

  /**
   * Creates a serializer for an array of items.
   *
   * @param item - The serializer to use for the array's items.
   * @param options - A set of options for the serializer.
   */
  array: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: ArraySerializerOptions
  ) => Serializer<T[], U[]>;

  /**
   * Creates a serializer for a map.
   *
   * @param key - The serializer to use for the map's keys.
   * @param value - The serializer to use for the map's values.
   * @param options - A set of options for the serializer.
   */
  map: <TK, TV, UK extends TK = TK, UV extends TV = TV>(
    key: Serializer<TK, UK>,
    value: Serializer<TV, UV>,
    options?: MapSerializerOptions
  ) => Serializer<Map<TK, TV>, Map<UK, UV>>;

  /**
   * Creates a serializer for a set.
   *
   * @param item - The serializer to use for the set's items.
   * @param options - A set of options for the serializer.
   */
  set: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: SetSerializerOptions
  ) => Serializer<Set<T>, Set<U>>;

  /**
   * Creates a serializer for an optional value using the {@link Option} type.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param options - A set of options for the serializer.
   */
  option: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: OptionSerializerOptions
  ) => Serializer<Option<T>, Option<U>>;

  /**
   * Creates a serializer for an optional value using `null` as the `None` value.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param options - A set of options for the serializer.
   */
  nullable: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: NullableSerializerOptions
  ) => Serializer<Nullable<T>, Nullable<U>>;

  /**
   * Creates a serializer for a custom object.
   *
   * @param fields - The name and serializer of each field.
   * @param options - A set of options for the serializer.
   */
  struct: <T extends object, U extends T = T>(
    fields: StructToSerializerTuple<T, U>,
    options?: StructSerializerOptions
  ) => Serializer<T, U>;

  /**
   * Creates a scalar enum serializer.
   *
   * @param constructor - The constructor of the scalar enum.
   * @param options - A set of options for the serializer.
   */
  enum<T>(
    constructor: ScalarEnum<T>,
    options?: EnumSerializerOptions
  ): Serializer<T>;

  /**
   * Creates a data enum serializer.
   *
   * @param variants - The variant serializers of the data enum.
   * @param options - A set of options for the serializer.
   */
  dataEnum<T extends DataEnum, U extends T = T>(
    variants: DataEnumToSerializerTuple<T, U>,
    options?: DataEnumSerializerOptions
  ): Serializer<T, U>;

  /**
   * Creates a string serializer.
   *
   * @param options - A set of options for the serializer.
   */
  string: (options?: StringSerializerOptions) => Serializer<string>;

  /**
   * Creates a boolean serializer.
   *
   * @param options - A set of options for the serializer.
   */
  bool: (options?: BoolSerializerOptions) => Serializer<boolean>;

  /**
   * Creates a void serializer.
   *
   * @param options - A set of options for the serializer.
   */
  unit: (options?: UnitSerializerOptions) => Serializer<void>;

  /**
   * Creates a serializer for 1-byte unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u8: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 2-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u16: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 4-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u32: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 8-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u64: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 16-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u128: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 1-byte signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i8: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 2-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i16: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 4-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i32: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 8-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i64: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 16-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i128: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 4-bytes floating point numbers.
   *
   * @param options - A set of options for the serializer.
   */
  f32: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 8-bytes floating point numbers.
   *
   * @param options - A set of options for the serializer.
   */
  f64: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer that passes the buffer as-is.
   *
   * @param options - A set of options for the serializer.
   */
  bytes: (options?: BytesSerializerOptions) => Serializer<Uint8Array>;

  /**
   * Creates a serializer for 32-bytes public keys.
   *
   * @param options - A set of options for the serializer.
   */
  publicKey: (
    options?: PublicKeySerializerOptions
  ) => Serializer<PublicKey | PublicKeyInput, PublicKey>;
}

export type StructToSerializerTuple<T extends object, U extends T> = Array<
  {
    [K in keyof T]: [K, Serializer<T[K], U[K]>];
  }[keyof T]
>;

export type DataEnumToSerializerTuple<T extends DataEnum, U extends T> = Array<
  T extends any
    ? [
        T['__kind'],
        keyof Omit<T, '__kind'> extends never
          ? Serializer<Omit<T, '__kind'>, Omit<U, '__kind'>> | Serializer<void>
          : Serializer<Omit<T, '__kind'>, Omit<U, '__kind'>>
      ]
    : never
>;

export enum Endian {
  Little = 'le',
  Big = 'be',
}

/**
 * Represents all the size options for array-like serializers
 * — i.e. `array`, `map` and `set`.
 *
 * It can be one of the following:
 * - a {@link NumberSerializer} that prefixes its content with its size.
 * - a fixed number of items.
 * - or `'remainder'` to infer the number of items by dividing
 *   the rest of the buffer by the fixed size of its item.
 *   Note that this option is only available for fixed-size items.
 */
export type ArrayLikeSerializerSize = NumberSerializer | number | 'remainder';

export type BaseSerializerOptions = {
  /** A custom description for the serializer. */
  description?: string;
};

export type TupleSerializerOptions = BaseSerializerOptions;

export type ArraySerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the array.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

export type MapSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the map.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

export type SetSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the set.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

export type OptionSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the boolean prefix.
   * @defaultValue `u8()`
   */
  prefix?: NumberSerializer;
  /**
   * Whether the item serializer should be of fixed size.
   *
   * When this is true, a `None` value will skip the bytes that would
   * have been used for the item. Note that this will only work if the
   * item serializer is of fixed size.
   * @defaultValue `false`
   */
  fixed?: boolean;
};

export type NullableSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the boolean prefix.
   * @defaultValue `u8()`
   */
  prefix?: NumberSerializer;
  /**
   * Whether the item serializer should be of fixed size.
   *
   * When this is true, a `null` value will skip the bytes that would
   * have been used for the item. Note that this will only work if the
   * item serializer is of fixed size.
   * @defaultValue `false`
   */
  fixed?: boolean;
};

export type StructSerializerOptions = BaseSerializerOptions;

export type EnumSerializerOptions = BaseSerializerOptions;

export type DataEnumSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the length prefix
   * @defaultValue `u32()`
   */
  prefix?: NumberSerializer;
};

export type StringSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the string. It can be one of the following:
   * - a {@link NumberSerializer} that prefixes the string with its size.
   * - a fixed number of bytes.
   * - or `'variable'` to use the rest of the buffer.
   * @defaultValue `u32()`
   */
  size?: NumberSerializer | number | 'variable';
  /**
   * The string serializer to use for encoding and decoding the content.
   * @defaultValue `utf8`
   */
  encoding?: Serializer<string>;
};

export type BoolSerializerOptions = BaseSerializerOptions & {
  /**
   * The number serializer to delegate to.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

export type UnitSerializerOptions = BaseSerializerOptions;

export type NumberSerializerOptions = BaseSerializerOptions & {
  /**
   * Whether the serializer should use little-endian or big-endian encoding.
   * @defaultValue `Endian.Big`
   */
  endian?: Endian;
};

export type BytesSerializerOptions = BaseSerializerOptions;

export type PublicKeySerializerOptions = BaseSerializerOptions;

export class NullSerializer implements SerializerInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'SerializerInterface',
    'serializer'
  );

  tuple<T extends any[], U extends T = T>(): Serializer<T, U> {
    throw this.error;
  }

  array<T, U extends T = T>(): Serializer<T[], U[]> {
    throw this.error;
  }

  map<TK, TV, UK extends TK = TK, UV extends TV = TV>(): Serializer<
    Map<TK, TV>,
    Map<UK, UV>
  > {
    throw this.error;
  }

  set<T, U extends T = T>(): Serializer<Set<T>, Set<U>> {
    throw this.error;
  }

  option<T, U extends T = T>(): Serializer<Option<T>, Option<U>> {
    throw this.error;
  }

  nullable<T, U extends T = T>(): Serializer<Nullable<T>, Nullable<U>> {
    throw this.error;
  }

  struct<T extends object, U extends T = T>(): Serializer<T, U> {
    throw this.error;
  }

  enum<T>(): Serializer<T> {
    throw this.error;
  }

  dataEnum<T extends DataEnum, U extends T = T>(): Serializer<T, U> {
    throw this.error;
  }

  string(): Serializer<string> {
    throw this.error;
  }

  bool(): Serializer<boolean> {
    throw this.error;
  }

  unit(): Serializer<void> {
    throw this.error;
  }

  u8(): Serializer<number> {
    throw this.error;
  }

  u16(): Serializer<number> {
    throw this.error;
  }

  u32(): Serializer<number> {
    throw this.error;
  }

  u64(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  u128(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  i8(): Serializer<number> {
    throw this.error;
  }

  i16(): Serializer<number> {
    throw this.error;
  }

  i32(): Serializer<number> {
    throw this.error;
  }

  i64(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  i128(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  f32(): Serializer<number> {
    throw this.error;
  }

  f64(): Serializer<number> {
    throw this.error;
  }

  bytes(): Serializer<Uint8Array> {
    throw this.error;
  }

  publicKey(): Serializer<PublicKey | PublicKeyInput, PublicKey> {
    throw this.error;
  }
}

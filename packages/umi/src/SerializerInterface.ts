import { DataEnum, ScalarEnum } from './Enums';
import { InterfaceImplementationMissingError } from './errors';
import type { PublicKey, PublicKeyInput } from './PublicKey';
import type {
  NumberSerializer,
  Serializer,
  WrapInSerializer,
} from './Serializer';
import type { Nullable, Option } from './Option';

/**
 * Defines the interface for a set of serializers
 * that can be used to serialize/deserialize any Serde types.
 *
 * @category Context and Interfaces
 */
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
    constructor: ScalarEnum<T> & {},
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
  u8: (options?: SingleByteNumberSerializerOptions) => Serializer<number>;

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
  i8: (options?: SingleByteNumberSerializerOptions) => Serializer<number>;

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

/**
 * Get the name and serializer of each field in a struct.
 * @category Serializers
 */
export type StructToSerializerTuple<T extends object, U extends T> = Array<
  {
    [K in keyof T]: [K, Serializer<T[K], U[K]>];
  }[keyof T]
>;

/**
 * Get the name and serializer of each variant in a data enum.
 * @category Serializers
 */
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

/**
 * Defines the endianness of a number serializer.
 * @category Serializers
 */
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
 *
 * @category Serializers
 */
export type ArrayLikeSerializerSize = NumberSerializer | number | 'remainder';

/**
 * Defines the common options for all methods in the serializer interface.
 * @category Serializers
 */
export type BaseSerializerOptions = {
  /** A custom description for the serializer. */
  description?: string;
};

/**
 * Defines the options for tuple serializers.
 * @category Serializers
 */
export type TupleSerializerOptions = BaseSerializerOptions;

/**
 * Defines the options for array serializers.
 * @category Serializers
 */
export type ArraySerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the array.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

/**
 * Defines the options for `Map` serializers.
 * @category Serializers
 */
export type MapSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the map.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

/**
 * Defines the options for `Set` serializers.
 * @category Serializers
 */
export type SetSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the set.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

/**
 * Defines the options for `Option` serializers.
 * @category Serializers
 */
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

/**
 * Defines the options for `Nullable` serializers.
 * @category Serializers
 */
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

/**
 * Defines the options for struct serializers.
 * @category Serializers
 */
export type StructSerializerOptions = BaseSerializerOptions;

/**
 * Defines the options for scalar enum serializers.
 * @category Serializers
 */
export type EnumSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the enum discriminator.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

/**
 * Defines the options for data enum serializers.
 * @category Serializers
 */
export type DataEnumSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the enum discriminator prefixing the variant.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

/**
 * Defines the options for string serializers.
 * @category Serializers
 */
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

/**
 * Defines the options for boolean serializers.
 * @category Serializers
 */
export type BoolSerializerOptions = BaseSerializerOptions & {
  /**
   * The number serializer to delegate to.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

/**
 * Defines the options for unit serializers.
 * @category Serializers
 */
export type UnitSerializerOptions = BaseSerializerOptions;

/**
 * Defines the options for u8 and i8 serializers.
 * @category Serializers
 */
export type SingleByteNumberSerializerOptions = BaseSerializerOptions;

/**
 * Defines the options for number serializers that use more than one byte.
 * @category Serializers
 */
export type NumberSerializerOptions = BaseSerializerOptions & {
  /**
   * Whether the serializer should use little-endian or big-endian encoding.
   * @defaultValue `Endian.Little`
   */
  endian?: Endian;
};

/**
 * Defines the options for bytes serializers.
 * @category Serializers
 */
export type BytesSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the buffer. It can be one of the following:
   * - a {@link NumberSerializer} that prefixes the buffer with its size.
   * - a fixed number of bytes.
   * - or `'variable'` to use the rest of the buffer.
   * @defaultValue `'variable'`
   */
  size?: NumberSerializer | number | 'variable';
};

/**
 * Defines the options for `PublicKey` serializers.
 * @category Serializers
 */
export type PublicKeySerializerOptions = BaseSerializerOptions;

/**
 * An implementation of the {@link SerializerInterface} that throws an error when called.
 * @category Serializers
 */
export function createNullSerializer(): SerializerInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError(
      'SerializerInterface',
      'serializer'
    );
  };
  return {
    tuple: errorHandler,
    array: errorHandler,
    map: errorHandler,
    set: errorHandler,
    option: errorHandler,
    nullable: errorHandler,
    struct: errorHandler,
    enum: errorHandler,
    dataEnum: errorHandler,
    string: errorHandler,
    bool: errorHandler,
    unit: errorHandler,
    u8: errorHandler,
    u16: errorHandler,
    u32: errorHandler,
    u64: errorHandler,
    u128: errorHandler,
    i8: errorHandler,
    i16: errorHandler,
    i32: errorHandler,
    i64: errorHandler,
    i128: errorHandler,
    f32: errorHandler,
    f64: errorHandler,
    bytes: errorHandler,
    publicKey: errorHandler,
  };
}

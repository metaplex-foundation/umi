import { DataEnum, ScalarEnum } from './Enums';
import { InterfaceImplementationMissingError } from './errors';
import type { PublicKey, PublicKeyInput } from './PublicKey';
import type {
  NumberSerializer,
  Serializer,
  WrapInSerializer,
} from './Serializer';
import type { Nullable, Option } from './Option';

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

export interface SerializerInterface {
  /**
   * Creates a serializer for a tuple-like array.
   *
   * @param items - The serializer to use for each item in the tuple.
   * @param description - A custom description for the serializer.
   */
  tuple: <T extends any[], U extends T = T>(
    items: WrapInSerializer<[...T], [...U]>,
    description?: string
  ) => Serializer<T, U>;

  /**
   * Creates a serializer for an array of variable length.
   *
   * @param item - The serializer to use for the array's items.
   * @param prefix - The serializer to use for the length prefix. Defaults to `u32`.
   * @param description - A custom description for the serializer.
   */
  vec: <T, U extends T = T>(
    item: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<T[], U[]>;

  /**
   * Creates a serializer for an array of fixed length.
   *
   * @param item - The serializer to use for the array's items.
   * @param size - The fixed size of the array.
   * @param description - A custom description for the serializer.
   */
  array: <T, U extends T = T>(
    item: Serializer<T, U>,
    size: number,
    description?: string
  ) => Serializer<T[], U[]>;

  /**
   * Creates a serializer for a map.
   *
   * @param key - The serializer to use for the map's keys.
   * @param value - The serializer to use for the map's values.
   * @param prefix - The serializer to use for the length prefix. Defaults to `u32`.
   * @param description - A custom description for the serializer.
   */
  map: <TK, TV, UK extends TK = TK, UV extends TV = TV>(
    key: Serializer<TK, UK>,
    value: Serializer<TV, UV>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<Map<TK, TV>, Map<UK, UV>>;

  /**
   * Creates a serializer for a set.
   *
   * @param item - The serializer to use for the set's items.
   * @param prefix - The serializer to use for the length prefix. Defaults to `u32`.
   * @param description - A custom description for the serializer.
   */
  set: <T, U extends T = T>(
    item: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<Set<T>, Set<U>>;

  /**
   * Creates a serializer for an optional value.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param prefix - The serializer to use for the boolean prefix. Defaults to `u8`.
   * @param description - A custom description for the serializer.
   */
  option: <T, U extends T = T>(
    item: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<Option<T>, Option<U>>;

  /**
   * Creates a fixed serializer for an optional value.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param prefix - The serializer to use for the boolean prefix. Defaults to `u8`.
   * @param description - A custom description for the serializer.
   */
  fixedOption: <T, U extends T = T>(
    item: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<Option<T>, Option<U>>;

  /**
   * Creates a serializer for a nullable value.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param prefix - The serializer to use for the boolean prefix. Defaults to `u8`.
   * @param description - A custom description for the serializer.
   */
  nullable: <T, U extends T = T>(
    item: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<Nullable<T>, Nullable<U>>;

  /**
   * Creates a fixed serializer for a nullable value.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param prefix - The serializer to use for the boolean prefix. Defaults to `u8`.
   * @param description - A custom description for the serializer.
   */
  fixedNullable: <T, U extends T = T>(
    item: Serializer<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ) => Serializer<Nullable<T>, Nullable<U>>;

  /**
   * Creates a serializer for a custom object.
   *
   * @param fields - The name and serializer of each field.
   * @param description - A custom description for the serializer.
   */
  struct: <T extends object, U extends T = T>(
    fields: StructToSerializerTuple<T, U>,
    description?: string
  ) => Serializer<T, U>;

  /**
   * Creates a scalar enum serializer.
   *
   * @param constructor - The constructor of the scalar enum.
   * @param description - A custom description for the serializer.
   */
  enum<T>(constructor: ScalarEnum<T>, description?: string): Serializer<T>;

  /**
   * Creates a data enum serializer.
   *
   * @param variants - The variant serializers of the data enum.
   * @param prefix - The serializer to use for the length prefix. Defaults to `u32`.
   * @param description - A custom description for the serializer.
   */
  dataEnum<T extends DataEnum, U extends T = T>(
    variants: DataEnumToSerializerTuple<T, U>,
    prefix?: NumberSerializer,
    description?: string
  ): Serializer<T, U>;

  /**
   * Creates a fixed-size serializer from a given serializer.
   *
   * @param bytes - The fixed number of bytes to read.
   * @param child - The serializer to wrap into a fixed-size serializer.
   * @param description - A custom description for the serializer.
   */
  fixed: <T, U extends T = T>(
    bytes: number,
    child: Serializer<T, U>,
    description?: string
  ) => Serializer<T, U>;

  /**
   * Creates a string serializer.
   *
   * @param prefix - The serializer to use for the length prefix. Defaults to `u32`.
   * @param content - The string serializer to use for the content. Defaults to `utf8`.
   * @param description - A custom description for the serializer.
   */
  string: (
    prefix?: NumberSerializer,
    content?: Serializer<string>,
    description?: string
  ) => Serializer<string>;

  /**
   * Creates a fixed-length serializer for strings.
   *
   * @param bytes - The fixed number of bytes to read.
   * @param content - The string serializer to use for the content. Defaults to `utf8`.
   * @param description - A custom description for the serializer.
   */
  fixedString: (
    bytes: number,
    content?: Serializer<string>,
    description?: string
  ) => Serializer<string>;

  /**
   * Creates a variable-length serializer for strings.
   *
   * @param content - The string serializer to use for the content. Defaults to `utf8`.
   * @param description - A custom description for the serializer.
   */
  variableString: (
    content?: Serializer<string>,
    description?: string
  ) => Serializer<string>;

  /**
   * Creates a boolean serializer.
   *
   * @param size - The number serializer to delegate to. Defaults to `u8`.
   * @param description - A custom description for the serializer.
   */
  bool: (size?: NumberSerializer, description?: string) => Serializer<boolean>;

  /** Creates a void serializer. */
  unit: Serializer<void>;

  /** Creates a serializer for 1-byte unsigned integers. */
  u8: Serializer<number>;

  /** Creates a serializer for 2-bytes unsigned integers. */
  u16: Serializer<number>;

  /** Creates a serializer for 4-bytes unsigned integers. */
  u32: Serializer<number>;

  /** Creates a serializer for 8-bytes unsigned integers. */
  u64: Serializer<number | bigint, bigint>;

  /** Creates a serializer for 16-bytes unsigned integers. */
  u128: Serializer<number | bigint, bigint>;

  /** Creates a serializer for 1-byte signed integers. */
  i8: Serializer<number>;

  /** Creates a serializer for 2-bytes signed integers. */
  i16: Serializer<number>;

  /** Creates a serializer for 4-bytes signed integers. */
  i32: Serializer<number>;

  /** Creates a serializer for 8-bytes signed integers. */
  i64: Serializer<number | bigint, bigint>;

  /** Creates a serializer for 16-bytes signed integers. */
  i128: Serializer<number | bigint, bigint>;

  /** Creates a serializer for 4-bytes floating point numbers. */
  f32: Serializer<number>;

  /** Creates a serializer for 8-bytes floating point numbers. */
  f64: Serializer<number>;

  /** Creates a serializer that passes the buffer as-is. */
  bytes: Serializer<Uint8Array>;

  /** Creates a serializer for 32-bytes public keys. */
  publicKey: Serializer<PublicKey | PublicKeyInput, PublicKey>;
}

export class NullSerializer implements SerializerInterface {
  private readonly error = new InterfaceImplementationMissingError(
    'SerializerInterface',
    'serializer'
  );

  tuple<T extends any[], U extends T = T>(): Serializer<T, U> {
    throw this.error;
  }

  vec<T, U extends T = T>(): Serializer<T[], U[]> {
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

  fixedOption<T, U extends T = T>(): Serializer<Option<T>, Option<U>> {
    throw this.error;
  }

  nullable<T, U extends T = T>(): Serializer<Nullable<T>, Nullable<U>> {
    throw this.error;
  }

  fixedNullable<T, U extends T = T>(): Serializer<Nullable<T>, Nullable<U>> {
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

  fixed<T, U extends T = T>(): Serializer<T, U> {
    throw this.error;
  }

  string(): Serializer<string> {
    throw this.error;
  }

  fixedString(): Serializer<string> {
    throw this.error;
  }

  variableString(): Serializer<string> {
    throw this.error;
  }

  bool(): Serializer<boolean> {
    throw this.error;
  }

  get unit(): Serializer<void> {
    throw this.error;
  }

  get u8(): Serializer<number> {
    throw this.error;
  }

  get u16(): Serializer<number> {
    throw this.error;
  }

  get u32(): Serializer<number> {
    throw this.error;
  }

  get u64(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  get u128(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  get i8(): Serializer<number> {
    throw this.error;
  }

  get i16(): Serializer<number> {
    throw this.error;
  }

  get i32(): Serializer<number> {
    throw this.error;
  }

  get i64(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  get i128(): Serializer<number | bigint, bigint> {
    throw this.error;
  }

  get f32(): Serializer<number> {
    throw this.error;
  }

  get f64(): Serializer<number> {
    throw this.error;
  }

  get bytes(): Serializer<Uint8Array> {
    throw this.error;
  }

  get publicKey(): Serializer<PublicKey | PublicKeyInput, PublicKey> {
    throw this.error;
  }
}

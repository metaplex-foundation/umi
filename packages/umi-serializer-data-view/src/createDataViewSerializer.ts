import {
  BoolSerializerOptions,
  fixSerializer,
  mergeBytes,
  none,
  Serializer,
  SerializerInterface,
  StringSerializerOptions,
  UnitSerializerOptions,
  utf8,
} from '@metaplex-foundation/umi';
import { array } from './array';
import { bytes } from './bytes';
import { dataEnum } from './dataEnum';
import {
  DataViewSerializerError,
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
} from './errors';
import { getSizeDescription } from './getSizeDescription';
import { map } from './map';
import { nullable } from './nullable';
import {
  f32,
  f64,
  i128,
  i16,
  i32,
  i64,
  i8,
  u128,
  u16,
  u32,
  u64,
  u8,
} from './numbers';
import { option } from './option';
import { publicKey } from './pubkey';
import { scalarEnum } from './scalarEnum';
import { set } from './set';
import { struct } from './struct';
import { tuple } from './tuple';

export type DataViewSerializerOptions = {
  /** @defaultValue `true` */
  tolerateEmptyBuffers?: boolean;
};

function getTolerantSerializerFactory<
  TSerializerFactory extends (...args: never[]) => Serializer<any, any>
>(
  serializerFactory: TSerializerFactory,
  defaultValueFactory: () => unknown
): TSerializerFactory {
  return ((...args) => {
    const originalSerializer = serializerFactory(...args);
    return {
      ...originalSerializer,
      deserialize(bytes: Uint8Array, offset = 0) {
        try {
          return originalSerializer.deserialize(bytes, offset);
        } catch (e) {
          if (e instanceof DeserializingEmptyBufferError) {
            return [defaultValueFactory(), offset];
          }
          throw e;
        }
      },
    };
  }) as TSerializerFactory;
}

export function createDataViewSerializer(
  options: DataViewSerializerOptions = {}
): SerializerInterface {
  const string = (
    options: StringSerializerOptions = {}
  ): Serializer<string> => {
    const size = options.size ?? u32();
    const encoding = options.encoding ?? utf8;
    const description =
      options.description ??
      `string(${encoding.description}; ${getSizeDescription(size)})`;

    if (size === 'variable') {
      return { ...encoding, description };
    }

    if (typeof size === 'number') {
      return fixSerializer(encoding, size, description);
    }

    return {
      description,
      fixedSize: null,
      maxSize: null,
      serialize: (value: string) => {
        const contentBytes = encoding.serialize(value);
        const lengthBytes = size.serialize(contentBytes.length);
        return mergeBytes([lengthBytes, contentBytes]);
      },
      deserialize: (buffer: Uint8Array, offset = 0) => {
        if (buffer.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('string');
        }
        const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
        const length = Number(lengthBigInt);
        offset = lengthOffset;
        const contentBuffer = buffer.slice(offset, offset + length);
        if (contentBuffer.length < length) {
          throw new NotEnoughBytesError('string', length, contentBuffer.length);
        }
        const [value, contentOffset] = encoding.deserialize(contentBuffer);
        offset += contentOffset;
        return [value, offset];
      },
    };
  };

  const bool = (options: BoolSerializerOptions = {}): Serializer<boolean> => {
    const size = options.size ?? u8();
    if (size.fixedSize === null) {
      throw new DataViewSerializerError(
        'Serializer [bool] requires a fixed size.'
      );
    }
    return {
      description: options.description ?? `bool(${size.description})`,
      fixedSize: size.fixedSize,
      maxSize: size.fixedSize,
      serialize: (value: boolean) => size.serialize(value ? 1 : 0),
      deserialize: (bytes: Uint8Array, offset = 0) => {
        if (bytes.slice(offset).length === 0) {
          throw new DeserializingEmptyBufferError('bool');
        }
        const [value, vOffset] = size.deserialize(bytes, offset);
        return [value === 1, vOffset];
      },
    };
  };

  const unit = (options: UnitSerializerOptions = {}): Serializer<void> => ({
    description: options.description ?? 'unit',
    fixedSize: 0,
    maxSize: 0,
    serialize: () => new Uint8Array(),
    deserialize: (_bytes: Uint8Array, offset = 0) => [undefined, offset],
  });

  const shouldTolerateEmptyBuffers = options.tolerateEmptyBuffers !== false;
  return {
    tuple,
    array: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(array, () => [])
      : array,
    map: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(map, () => new Map())
      : map,
    set: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(set, () => new Set())
      : set,
    option: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(option, () => none())
      : option,
    nullable: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(nullable, () => null)
      : nullable,
    struct,
    enum: scalarEnum,
    dataEnum,
    string,
    bool,
    unit,
    u8,
    u16,
    u32,
    u64,
    u128,
    i8,
    i16,
    i32,
    i64,
    i128,
    f32,
    f64,
    bytes,
    publicKey,
  };
}

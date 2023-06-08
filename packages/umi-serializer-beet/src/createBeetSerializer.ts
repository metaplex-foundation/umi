import {
  none,
  Serializer,
  SerializerInterface,
} from '@metaplex-foundation/umi';
import { array } from './array';
import { bool } from './bool';
import { bytes } from './bytes';
import { dataEnum } from './dataEnum';
import { DeserializingEmptyBufferError } from './errors';
import { map } from './map';
import { nullable } from './nullable';
import {
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
  f32,
  f64,
} from './numbers';
import { option } from './option';
import { publicKey } from './pubkey';
import { scalarEnum } from './scalarEnum';
import { set } from './set';
import { string } from './string';
import { struct } from './struct';
import { tuple } from './tuple';
import { unit } from './unit';

export type BeetSerializerOptions = {
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

export function createBeetSerializer(
  options: BeetSerializerOptions = {}
): SerializerInterface {
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

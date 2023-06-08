import { Serializer, SerializerInterface } from '@metaplex-foundation/umi';
import { array } from './array';
import { bool } from './bool';
import { bytes } from './bytes';
import { dataEnum } from './dataEnum';
import { DeserializingEmptyBufferError } from './errors';
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
>(serializerFactory: TSerializerFactory): TSerializerFactory {
  return ((...args) => {
    const originalSerializer = serializerFactory(...args);
    return {
      ...originalSerializer,
      deserialize(bytes: Uint8Array, offset = 0) {
        try {
          return originalSerializer.deserialize(bytes, offset);
        } catch (e) {
          if (
            e instanceof DeserializingEmptyBufferError &&
            e.toleratedDefaultValue !== undefined
          ) {
            return [e.toleratedDefaultValue, offset];
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
      ? getTolerantSerializerFactory(array)
      : array,
    map: shouldTolerateEmptyBuffers ? getTolerantSerializerFactory(map) : map,
    set: shouldTolerateEmptyBuffers ? getTolerantSerializerFactory(set) : set,
    option: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(option)
      : option,
    nullable: shouldTolerateEmptyBuffers
      ? getTolerantSerializerFactory(nullable)
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

import { Serializer, UnitSerializerOptions } from '@metaplex-foundation/umi';

export function unit(options: UnitSerializerOptions = {}): Serializer<void> {
  return {
    description: options.description ?? 'unit',
    fixedSize: 0,
    maxSize: 0,
    serialize: () => new Uint8Array(),
    deserialize: (_bytes: Uint8Array, offset = 0) => [undefined, offset],
  };
}

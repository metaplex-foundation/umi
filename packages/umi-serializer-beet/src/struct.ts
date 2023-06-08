import {
  StructToSerializerTuple,
  StructSerializerOptions,
  Serializer,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { sumSerializerSizes } from './sumSerializerSizes';

export function struct<T extends object, U extends T = T>(
  fields: StructToSerializerTuple<T, U>,
  options: StructSerializerOptions = {}
): Serializer<T, U> {
  const fieldDescriptions = fields
    .map(([name, serializer]) => `${String(name)}: ${serializer.description}`)
    .join(', ');
  return {
    description: options.description ?? `struct(${fieldDescriptions})`,
    fixedSize: sumSerializerSizes(fields.map(([, field]) => field.fixedSize)),
    maxSize: sumSerializerSizes(fields.map(([, field]) => field.maxSize)),
    serialize: (struct: T) => {
      const fieldBytes = fields.map(([key, serializer]) =>
        serializer.serialize(struct[key])
      );
      return mergeBytes(fieldBytes);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const struct: Partial<U> = {};
      fields.forEach(([key, serializer]) => {
        const [value, newOffset] = serializer.deserialize(bytes, offset);
        offset = newOffset;
        struct[key] = value;
      });
      return [struct as U, offset];
    },
  };
}

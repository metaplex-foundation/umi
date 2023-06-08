import {
  Serializer,
  TupleSerializerOptions,
  WrapInSerializer,
  mergeBytes,
} from '@metaplex-foundation/umi';
import { BeetSerializerError } from './errors';
import { sumSerializerSizes } from './sumSerializerSizes';

export function tuple<T extends any[], U extends T = T>(
  items: WrapInSerializer<[...T], [...U]>,
  options: TupleSerializerOptions = {}
): Serializer<T, U> {
  const itemDescriptions = items.map((item) => item.description).join(', ');
  return {
    description: options.description ?? `tuple(${itemDescriptions})`,
    fixedSize: sumSerializerSizes(items.map((item) => item.fixedSize)),
    maxSize: sumSerializerSizes(items.map((item) => item.maxSize)),
    serialize: (value: T) => {
      if (value.length !== items.length) {
        throw new BeetSerializerError(
          `Expected tuple to have ${items.length} items but got ${value.length}.`
        );
      }
      return mergeBytes(
        items.map((item, index) => item.serialize(value[index]))
      );
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const values = [] as any as U;
      items.forEach((serializer) => {
        const [newValue, newOffset] = serializer.deserialize(bytes, offset);
        values.push(newValue);
        offset = newOffset;
      });
      return [values, offset];
    },
  };
}

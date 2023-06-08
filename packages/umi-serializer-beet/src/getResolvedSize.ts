import { ArrayLikeSerializerSize } from '@metaplex-foundation/umi';
import { BeetSerializerError } from './errors';
import { sumSerializerSizes } from './sumSerializerSizes';

export function getResolvedSize(
  size: ArrayLikeSerializerSize,
  childrenSizes: (number | null)[],
  bytes: Uint8Array,
  offset: number
): [number | bigint, number] {
  if (typeof size === 'number') {
    return [size, offset];
  }

  if (typeof size === 'object') {
    return size.deserialize(bytes, offset);
  }

  if (size === 'remainder') {
    const childrenSize = sumSerializerSizes(childrenSizes);
    if (childrenSize === null) {
      throw new BeetSerializerError(
        'Serializers of "remainder" size must have fixed-size items.'
      );
    }
    const remainder = bytes.slice(offset).length;
    if (remainder % childrenSize !== 0) {
      throw new BeetSerializerError(
        `Serializers of "remainder" size must have a remainder that is a multiple of its item size. ` +
          `Got ${remainder} bytes remaining and ${childrenSize} bytes per item.`
      );
    }
    return [remainder / childrenSize, offset];
  }

  throw new BeetSerializerError(`Unknown size type: ${JSON.stringify(size)}.`);
}

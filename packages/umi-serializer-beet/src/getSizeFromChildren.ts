import { ArrayLikeSerializerSize } from '@metaplex-foundation/umi';
import { sumSerializerSizes } from './sumSerializerSizes';

export function getSizeFromChildren(
  size: ArrayLikeSerializerSize,
  childrenSizes: (number | null)[]
): number | null {
  if (typeof size !== 'number') return null;
  if (size === 0) return 0;
  const childrenSize = sumSerializerSizes(childrenSizes);
  return childrenSize === null ? null : childrenSize * size;
}

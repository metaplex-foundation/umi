import { ArrayLikeSerializerSize } from '@metaplex-foundation/umi';

export function getSizeDescription(
  size: ArrayLikeSerializerSize | string
): string {
  return typeof size === 'object' ? size.description : `${size}`;
}

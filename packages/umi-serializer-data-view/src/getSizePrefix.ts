import { ArrayLikeSerializerSize } from '@metaplex-foundation/umi';

export function getSizePrefix(
  size: ArrayLikeSerializerSize,
  realSize: number
): Uint8Array {
  return typeof size === 'object' ? size.serialize(realSize) : new Uint8Array();
}

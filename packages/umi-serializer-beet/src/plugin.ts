import { UmiPlugin } from '@metaplex-foundation/umi';
import {
  BeetSerializerOptions,
  createBeetSerializer,
} from './createBeetSerializer';

export const beetSerializer = (
  options: BeetSerializerOptions = {}
): UmiPlugin => ({
  install(umi) {
    umi.serializer = createBeetSerializer(options);
  },
});

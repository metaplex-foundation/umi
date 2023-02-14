import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { BeetSerializer } from './BeetSerializer';

export const beetSerializer = (): UmiPlugin => ({
  install(umi) {
    umi.serializer = new BeetSerializer();
  },
});

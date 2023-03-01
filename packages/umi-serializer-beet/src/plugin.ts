import { UmiPlugin } from '@metaplex-foundation/umi';
import { BeetSerializer } from './BeetSerializer';

export const beetSerializer = (): UmiPlugin => ({
  install(umi) {
    umi.serializer = new BeetSerializer();
  },
});

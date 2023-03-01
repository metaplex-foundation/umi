import { UmiPlugin } from '@metaplex-foundation/umi';
import { DataViewSerializer } from './DataViewSerializer';

export const dataViewSerializer = (): UmiPlugin => ({
  install(umi) {
    umi.serializer = new DataViewSerializer();
  },
});

import type { RpcInterface } from '@metaplex-foundation/umi';
import { UmiPlugin } from '@metaplex-foundation/umi';
import type { DasApiInterface } from '@metaplex-foundation/digital-asset-standard-api';
import { createDasLiteIndexer } from './createDasLiteIndexer';

export const dasLite = (): UmiPlugin => ({
  install(umi) {
    umi.rpc = createDasLiteIndexer(umi.rpc);
  },
});

declare module '@metaplex-foundation/umi/dist/types/Umi' {
  interface Umi {
    rpc: RpcInterface & DasApiInterface;
  }
}

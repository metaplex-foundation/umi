import { UmiPlugin } from '@metaplex-foundation/umi';
import { LiteSVM } from 'litesvm';
import { createLiteSvmRpc } from './createLiteSvmRpc';

export function liteSvmRpc(liteSvm: LiteSVM): UmiPlugin {
  return {
    install(umi) {
      umi.rpc =
        createLiteSvmRpc(umi, liteSvm);
    },
  };
}

import { UmiPlugin } from '@metaplex-foundation/umi';
import { createWeb3JsRpc, Web3JsRpcOptions } from './createWeb3JsRpc';

export const web3JsRpc = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): UmiPlugin => ({
  install(umi) {
    umi.rpc = createWeb3JsRpc(umi, endpoint, rpcOptions);
  },
});

import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { Web3JsRpc, Web3JsRpcOptions } from './Web3JsRpc';

export const web3JsRpc = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): UmiPlugin => ({
  install(umi) {
    umi.rpc = new Web3JsRpc(umi, endpoint, rpcOptions);
  },
});

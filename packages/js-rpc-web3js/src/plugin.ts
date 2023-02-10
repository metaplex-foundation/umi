import { MetaplexPlugin } from '@lorisleiva/js-core';
import { Web3JsRpc, Web3JsRpcOptions } from './Web3JsRpc';

export const web3JsRpc = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.rpc = new Web3JsRpc(metaplex, endpoint, rpcOptions);
  },
});

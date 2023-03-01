import { Umi, createUmi as baseCreateUmi } from '@metaplex-foundation/umi';
import type { Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import { defaultPlugins } from './plugin';

export const createUmi = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): Umi => baseCreateUmi().use(defaultPlugins(endpoint, rpcOptions));

export * from './plugin';

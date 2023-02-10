import {
  Metaplex,
  createMetaplex as baseCreateMetaplex,
} from '@metaplex-foundation/umi-core';
import type { Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import { defaultPlugins } from './plugin';

export const createMetaplex = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): Metaplex => baseCreateMetaplex().use(defaultPlugins(endpoint, rpcOptions));

export * from './plugin';
export * from '@metaplex-foundation/umi-core';

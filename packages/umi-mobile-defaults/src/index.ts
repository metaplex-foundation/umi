import { createUmi, Umi } from '@metaplex-foundation/umi';
import type { ChunkGetAccountsRpcOptions } from '@metaplex-foundation/umi-rpc-chunk-get-accounts';
import type { Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import { mobileDefaultPlugins } from './plugin';

export * from './plugin';

export function createUmiMobile(
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions & ChunkGetAccountsRpcOptions
): Umi {
  return createUmi().use(mobileDefaultPlugins(endpoint, rpcOptions));
} 
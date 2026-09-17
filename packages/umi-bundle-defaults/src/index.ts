import { Umi, createBaseUmi } from '@metaplex-foundation/umi';
import type { ChunkGetAccountsRpcOptions } from '@metaplex-foundation/umi-rpc-chunk-get-accounts';
import type { Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import type { Web3JsTransactionFactoryOptions } from '@metaplex-foundation/umi-transaction-factory-web3js';
import type { Connection as Web3JsConnection } from '@solana/web3.js';
import { defaultPlugins } from './plugin';

export function createUmi(
  endpoint: string,
  options?: Web3JsRpcOptions &
    ChunkGetAccountsRpcOptions &
    Web3JsTransactionFactoryOptions
): Umi;
export function createUmi(
  connection: Web3JsConnection,
  options?: ChunkGetAccountsRpcOptions & Web3JsTransactionFactoryOptions
): Umi;
export function createUmi(
  endpointOrConnection: string | Web3JsConnection,
  options?: Web3JsRpcOptions &
    ChunkGetAccountsRpcOptions &
    Web3JsTransactionFactoryOptions
): Umi {
  return createBaseUmi().use(
    typeof endpointOrConnection === 'string'
      ? defaultPlugins(endpointOrConnection, options)
      : defaultPlugins(endpointOrConnection, options)
  );
}

export * from './plugin';

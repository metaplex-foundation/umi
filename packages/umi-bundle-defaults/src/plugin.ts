import type { UmiPlugin } from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import {
  web3JsRpc,
  Web3JsRpcOptions,
} from '@metaplex-foundation/umi-rpc-web3js';
import {
  chunkGetAccountsRpc,
  ChunkGetAccountsRpcOptions,
} from '@metaplex-foundation/umi-rpc-chunk-get-accounts';
import { dataViewSerializer } from '@metaplex-foundation/umi-serializer-data-view';
import {
  web3JsTransactionFactory,
  Web3JsTransactionFactoryOptions,
} from '@metaplex-foundation/umi-transaction-factory-web3js';
import type { Connection as Web3JsConnection } from '@solana/web3.js';

export function defaultPlugins(
  endpoint: string,
  options?: Web3JsRpcOptions &
    ChunkGetAccountsRpcOptions &
    Web3JsTransactionFactoryOptions
): UmiPlugin;
export function defaultPlugins(
  connection: Web3JsConnection,
  options?: ChunkGetAccountsRpcOptions & Web3JsTransactionFactoryOptions
): UmiPlugin;
export function defaultPlugins(
  endpointOrConnection: string | Web3JsConnection,
  options?: Web3JsRpcOptions &
    ChunkGetAccountsRpcOptions &
    Web3JsTransactionFactoryOptions
): UmiPlugin {
  return {
    install(umi) {
      umi.use(dataViewSerializer());
      umi.use(defaultProgramRepository());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(web3JsEddsa());
      umi.use(
        typeof endpointOrConnection === 'string'
          ? web3JsRpc(endpointOrConnection, options)
          : web3JsRpc(endpointOrConnection)
      );
      umi.use(chunkGetAccountsRpc(options?.getAccountsChunkSize));
      umi.use(
        web3JsTransactionFactory({
          defaultTransactionVersion: options?.defaultTransactionVersion,
        })
      );
    },
  };
}

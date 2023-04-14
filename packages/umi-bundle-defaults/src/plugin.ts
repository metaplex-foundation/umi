import type { UmiPlugin } from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import {
  web3JsRpc,
  Web3JsRpcOptions,
} from '@metaplex-foundation/umi-rpc-web3js';
import { chunkGetAccountsRpc } from '@metaplex-foundation/umi-rpc-chunk-get-accounts';
import { dataViewSerializer } from '@metaplex-foundation/umi-serializer-data-view';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';

export const defaultPlugins = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions & { getAccountsChunkSize?: number }
): UmiPlugin => ({
  install(umi) {
    umi.use(dataViewSerializer());
    umi.use(defaultProgramRepository());
    umi.use(fetchHttp());
    umi.use(httpDownloader());
    umi.use(web3JsEddsa());
    umi.use(web3JsRpc(endpoint, rpcOptions));
    umi.use(chunkGetAccountsRpc(rpcOptions?.getAccountsChunkSize));
    umi.use(web3JsTransactionFactory());
  },
});

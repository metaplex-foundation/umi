import type { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import {
  web3JsRpc,
  Web3JsRpcOptions,
} from '@metaplex-foundation/umi-rpc-web3js';
import { beetSerializer } from '@metaplex-foundation/umi-serializer-beet';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';

export const defaultPlugins = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.use(beetSerializer());
    metaplex.use(defaultProgramRepository());
    metaplex.use(fetchHttp());
    metaplex.use(httpDownloader());
    metaplex.use(web3JsEddsa());
    metaplex.use(web3JsRpc(endpoint, rpcOptions));
    metaplex.use(web3JsTransactionFactory());
  },
});

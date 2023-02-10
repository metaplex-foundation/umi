import type { MetaplexPlugin } from '@lorisleiva/js-core';
import { httpDownloader } from '@lorisleiva/js-downloader-http';
import { web3JsEddsa } from '@lorisleiva/js-eddsa-web3js';
import { fetchHttp } from '@lorisleiva/js-http-fetch';
import { defaultProgramRepository } from '@lorisleiva/js-program-repository';
import { web3JsRpc, Web3JsRpcOptions } from '@lorisleiva/js-rpc-web3js';
import { beetSerializer } from '@lorisleiva/js-serializer-beet';
import { web3JsTransactionFactory } from '@lorisleiva/js-transaction-factory-web3js';

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

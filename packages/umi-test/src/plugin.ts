import {
  generatedSignerIdentity,
  MetaplexPlugin,
} from '@metaplex-foundation/umi-core';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import {
  web3JsRpc,
  Web3JsRpcOptions,
} from '@metaplex-foundation/umi-rpc-web3js';
import { beetSerializer } from '@metaplex-foundation/umi-serializer-beet';
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';

export const testPlugins = (
  endpoint: string = 'http://localhost:8899',
  rpcOptions: Web3JsRpcOptions = 'confirmed'
): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.use(beetSerializer());
    metaplex.use(defaultProgramRepository());
    metaplex.use(fetchHttp());
    metaplex.use(web3JsEddsa());
    metaplex.use(web3JsRpc(endpoint, rpcOptions));
    metaplex.use(web3JsTransactionFactory());
    metaplex.use(mockStorage());
    metaplex.use(generatedSignerIdentity());
  },
});

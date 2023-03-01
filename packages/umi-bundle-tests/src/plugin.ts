import { generatedSignerIdentity, UmiPlugin } from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import {
  web3JsRpc,
  Web3JsRpcOptions,
} from '@metaplex-foundation/umi-rpc-web3js';
import { dataViewSerializer } from '@metaplex-foundation/umi-serializer-data-view';
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';

export const testPlugins = (
  endpoint: string = 'http://127.0.0.1:8899',
  rpcOptions: Web3JsRpcOptions = 'confirmed'
): UmiPlugin => ({
  install(umi) {
    umi.use(dataViewSerializer());
    umi.use(defaultProgramRepository());
    umi.use(fetchHttp());
    umi.use(web3JsEddsa());
    umi.use(web3JsRpc(endpoint, rpcOptions));
    umi.use(web3JsTransactionFactory());
    umi.use(mockStorage());
    umi.use(generatedSignerIdentity());
  },
});

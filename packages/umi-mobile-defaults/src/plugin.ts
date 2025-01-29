import { UmiPlugin } from '@metaplex-foundation/umi';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { defaultProgramRepository } from '@metaplex-foundation/umi-program-repository';
import { chunkGetAccountsRpc } from '@metaplex-foundation/umi-rpc-chunk-get-accounts';
import { web3JsRpc, type Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import { web3JsTransactionFactory } from '@metaplex-foundation/umi-transaction-factory-web3js';
import type { ChunkGetAccountsRpcOptions } from '@metaplex-foundation/umi-rpc-chunk-get-accounts';

export function mobileDefaultPlugins(
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions & ChunkGetAccountsRpcOptions
): UmiPlugin {
  return {
    install(umi) {
      umi.use(defaultProgramRepository());
      umi.use(web3JsEddsa());
      umi.use(web3JsRpc(endpoint, rpcOptions));
      umi.use(chunkGetAccountsRpc(rpcOptions?.getAccountsChunkSize));
      umi.use(web3JsTransactionFactory());
    },
  };
} 
import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { Web3JsTransactionFactory } from './Web3JsTransactionFactory';

export const web3JsTransactionFactory = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.transactions = new Web3JsTransactionFactory();
  },
});

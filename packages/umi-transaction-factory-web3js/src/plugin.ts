import { UmiPlugin } from '@metaplex-foundation/umi';
import { Web3JsTransactionFactory } from './Web3JsTransactionFactory';

export const web3JsTransactionFactory = (): UmiPlugin => ({
  install(umi) {
    umi.transactions = new Web3JsTransactionFactory(umi);
  },
});

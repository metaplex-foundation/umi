import { UmiPlugin } from '@metaplex-foundation/umi';
import {
  createWeb3JsTransactionFactory,
  Web3JsTransactionFactoryOptions,
} from './createWeb3JsTransactionFactory';

export const web3JsTransactionFactory = (
  options: Web3JsTransactionFactoryOptions = {}
): UmiPlugin => ({
  install(umi) {
    umi.transactions = createWeb3JsTransactionFactory(options);
  },
});

import { UmiPlugin } from '@metaplex-foundation/umi-core';
import { Web3JsEddsa } from './Web3JsEddsa';

export const web3JsEddsa = (): UmiPlugin => ({
  install(umi) {
    umi.eddsa = new Web3JsEddsa();
  },
});

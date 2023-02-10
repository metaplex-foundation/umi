import { MetaplexPlugin } from '@metaplex-foundation/umi-core';
import { Web3JsEddsa } from './Web3JsEddsa';

export const web3JsEddsa = (): MetaplexPlugin => ({
  install(metaplex) {
    metaplex.eddsa = new Web3JsEddsa();
  },
});

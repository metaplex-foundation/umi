import {
  Metaplex,
  createMetaplex as baseCreateMetaplex,
  sol,
  Context,
  generateSigner,
} from '@lorisleiva/js-core';
import { Web3JsRpcOptions } from '@lorisleiva/js-rpc-web3js';
import { testPlugins } from './plugin';

export const createMetaplex = async (
  endpoint?: string,
  rpcOptions?: Web3JsRpcOptions,
  airdropAmount = sol(100)
): Promise<Metaplex> => {
  const metaplex = baseCreateMetaplex().use(testPlugins(endpoint, rpcOptions));
  await metaplex.rpc.airdrop(metaplex.identity.publicKey, airdropAmount);
  return metaplex;
};

export const generateSignerWithSol = async (
  context: Pick<Context, 'eddsa' | 'rpc'>,
  airdropAmount = sol(100)
) => {
  const signer = generateSigner(context);
  await context.rpc.airdrop(signer.publicKey, airdropAmount);
  return signer;
};

export * from './plugin';
export * from '@lorisleiva/js-core';

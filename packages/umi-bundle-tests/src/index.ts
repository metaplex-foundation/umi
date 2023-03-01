import {
  Umi,
  createUmi as baseCreateUmi,
  sol,
  Context,
  generateSigner,
} from '@metaplex-foundation/umi';
import { Web3JsRpcOptions } from '@metaplex-foundation/umi-rpc-web3js';
import { testPlugins } from './plugin';

export const createUmi = async (
  endpoint?: string,
  rpcOptions?: Web3JsRpcOptions,
  airdropAmount = sol(100)
): Promise<Umi> => {
  const umi = baseCreateUmi().use(testPlugins(endpoint, rpcOptions));
  await umi.rpc.airdrop(umi.identity.publicKey, airdropAmount);
  return umi;
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

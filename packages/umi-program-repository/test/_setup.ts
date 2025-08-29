import {
  Cluster,
  PublicKeyInput,
  RpcInterface,
  createBaseUmi,
  defaultPublicKey,
  publicKey,
} from '@metaplex-foundation/umi';
import { defaultProgramRepository } from '../src';

export const createUmi = (cluster: Cluster = 'localnet') => {
  const umi = createBaseUmi().use(defaultProgramRepository());
  umi.rpc = { getCluster: () => cluster } as RpcInterface;
  return umi;
};

export const createProgram = (
  name: string,
  publicKeyInput: PublicKeyInput = defaultPublicKey()
) => ({
  name,
  publicKey: publicKey(publicKeyInput),
  getErrorFromCode: () => null,
  getErrorFromName: () => null,
  isOnCluster: () => true,
});

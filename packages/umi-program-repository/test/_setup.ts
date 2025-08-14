import {
  Cluster,
  PublicKeyInput,
  RpcInterface,
  createNullUmi,
  defaultPublicKey,
  publicKey,
} from '@metaplex-foundation/umi';
import { defaultProgramRepository } from '../src';

export const createUmi = (cluster: Cluster = 'localnet') => {
  const umi = createNullUmi().use(defaultProgramRepository());
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

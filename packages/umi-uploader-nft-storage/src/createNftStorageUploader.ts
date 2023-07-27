/* eslint-disable no-await-in-loop */
import {
  Context,
  createGenericFileFromJson,
  GenericFile,
  getBytesFromGenericFiles,
  isKeypairSigner,
  lamports,
  publicKeyBytes,
  Signer,
  SolAmount,
  UploaderInterface,
  UploaderUploadOptions,
} from '@metaplex-foundation/umi';
import { NFTStorageMetaplexor } from '@nftstorage/metaplex-auth';
import { MemoryBlockStore } from 'ipfs-car/blockstore/memory';
import { Blob, NFTStorage } from 'nft.storage';
import {
  toDagPbLink,
  toDirectoryBlock,
  toEncodedCar,
  toGatewayUri,
  toIpfsUri,
} from './utils';

export type NftStorageUploaderOptions = {
  payer?: Signer;
  token: string;
  endpoint?: URL;
  gatewayHost?: string;
  batchSize?: number;
  useGatewayUrls?: boolean;
};

export function createNftStorageUploader(
  context: Pick<Context, 'rpc' | 'payer'>,
  options: NftStorageUploaderOptions = { token: '' }
): UploaderInterface & {
  client: () => Promise<NFTStorage | NFTStorageMetaplexor>;
} {
  const { payer } = options;
  const { token } = options;
  const { endpoint } = options;
  const { gatewayHost } = options;
  const batchSize = options.batchSize ?? 50;
  const useGatewayUrls = options.useGatewayUrls ?? true;
  if (!token) {
    throw new Error('NFT Storage token is required');
  }

  const getClient = async (): Promise<NFTStorage | NFTStorageMetaplexor> => {
    if (token) {
      return new NFTStorage({ token, endpoint });
    }

    const signer: Signer = payer ?? context.payer;
    const authOptions = {
      mintingAgent: '@metaplex-foundation/umi-plugin-nft-storage',
      solanaCluster: context.rpc.getCluster(),
      endpoint,
    };

    return isKeypairSigner(signer)
      ? NFTStorageMetaplexor.withSecretKey(signer.secretKey, authOptions)
      : NFTStorageMetaplexor.withSigner(
          signer.signMessage.bind(signer),
          publicKeyBytes(signer.publicKey),
          authOptions
        );
  };

  const getUploadPrice = async (): Promise<SolAmount> => lamports(0);

  const upload = async (
    files: GenericFile[],
    options: UploaderUploadOptions = {}
  ): Promise<string[]> => {
    if (batchSize <= 0) {
      throw new Error('batchSize must be greater than 0');
    }

    const client = await getClient();
    const blockstore = new MemoryBlockStore();
    const uris: string[] = [];
    const numBatches = Math.ceil(files.length / batchSize);
    const batches: GenericFile[][] = new Array(numBatches)
      .fill([])
      .map((_, i) => files.slice(i * batchSize, (i + 1) * batchSize));

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      const batchLinks = [];

      for (let j = 0; j < batch.length; j += 1) {
        const file = batch[j];
        const blob = new Blob([file.buffer]);
        const node = await NFTStorage.encodeBlob(blob, { blockstore });
        const fileUri = useGatewayUrls
          ? toGatewayUri(node.cid.toString(), undefined, gatewayHost)
          : toIpfsUri(node.cid.toString());
        uris.push(fileUri);
        batchLinks.push(await toDagPbLink(node, file.uniqueName));
      }

      const batchBlock = await toDirectoryBlock(batchLinks);
      const { cid, car } = await toEncodedCar(batchBlock, blockstore);

      const storeOptions: Parameters<typeof client.storeCar>[2] = {};
      if (options.onProgress) {
        const { onProgress } = options;
        const totalSize = getBytesFromGenericFiles(...files);
        let uploadedSize = 0;
        storeOptions.onStoredChunk = (size: number) => {
          uploadedSize += size;
          const percent = (uploadedSize / totalSize) * 100;
          onProgress(Math.min(percent, 100), size);
        };
      }

      const promise = isNFTStorageMetaplexor(client)
        ? client.storeCar(cid, car, storeOptions)
        : client.storeCar(car, storeOptions);

      await promise;
    }

    return uris;
  };

  const uploadJson = async <T>(json: T): Promise<string> => {
    const file = createGenericFileFromJson(json);
    const uris = await upload([file]);
    return uris[0];
  };

  return {
    getUploadPrice,
    upload,
    uploadJson,
    client: getClient,
  };
}

const isNFTStorageMetaplexor = (
  client: NFTStorage | NFTStorageMetaplexor
): client is NFTStorageMetaplexor => 'storeNFTFromFilesystem' in client;

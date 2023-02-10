/* eslint-disable no-await-in-loop */
import {
  Context,
  createGenericFileFromJson,
  GenericFile,
  getBytesFromGenericFiles,
  isKeypairSigner,
  lamports,
  Signer,
  SolAmount,
  UploaderInterface,
  UploaderUploadOptions,
} from '@lorisleiva/js-core';
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
  token?: string;
  endpoint?: URL;
  gatewayHost?: string;
  batchSize?: number;
  useGatewayUrls?: boolean;
};

export class NftStorageUploader implements UploaderInterface {
  protected readonly context: Pick<Context, 'rpc' | 'payer'>;

  readonly payer?: Signer;

  readonly token?: string;

  readonly endpoint?: URL;

  readonly gatewayHost?: string;

  batchSize: number;

  useGatewayUrls: boolean;

  constructor(
    context: Pick<Context, 'rpc' | 'payer'>,
    options: NftStorageUploaderOptions = {}
  ) {
    this.context = context;
    this.payer = options.payer;
    this.token = options.token;
    this.endpoint = options.endpoint;
    this.gatewayHost = options.gatewayHost;
    this.batchSize = options.batchSize ?? 50;
    this.useGatewayUrls = options.useGatewayUrls ?? true;
  }

  async getUploadPrice(): Promise<SolAmount> {
    return lamports(0);
  }

  async upload(
    files: GenericFile[],
    options: UploaderUploadOptions = {}
  ): Promise<string[]> {
    if (this.batchSize <= 0) {
      throw new Error('batchSize must be greater than 0');
    }

    const client = await this.client();
    const blockstore = new MemoryBlockStore();
    const uris: string[] = [];
    const numBatches = Math.ceil(files.length / this.batchSize);
    const batches: GenericFile[][] = new Array(numBatches)
      .fill([])
      .map((_, i) => files.slice(i * this.batchSize, (i + 1) * this.batchSize));

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      const batchLinks = [];

      for (let j = 0; j < batch.length; j += 1) {
        const file = batch[j];
        const blob = new Blob([file.buffer]);
        const node = await NFTStorage.encodeBlob(blob, { blockstore });
        const fileUri = this.useGatewayUrls
          ? toGatewayUri(node.cid.toString(), undefined, this.gatewayHost)
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
  }

  async uploadJson<T>(json: T): Promise<string> {
    const file = createGenericFileFromJson(json);
    const uris = await this.upload([file]);
    return uris[0];
  }

  async client(): Promise<NFTStorage | NFTStorageMetaplexor> {
    if (this.token) {
      return new NFTStorage({
        token: this.token,
        endpoint: this.endpoint,
      });
    }

    const signer: Signer = this.payer ?? this.context.payer;
    const authOptions = {
      mintingAgent: '@metaplex-foundation/js-plugin-nft-storage',
      solanaCluster: this.context.rpc.getCluster(),
      endpoint: this.endpoint,
    };

    return isKeypairSigner(signer)
      ? NFTStorageMetaplexor.withSecretKey(signer.secretKey, authOptions)
      : NFTStorageMetaplexor.withSigner(
          signer.signMessage.bind(signer),
          signer.publicKey.bytes,
          authOptions
        );
  }
}

const isNFTStorageMetaplexor = (
  client: NFTStorage | NFTStorageMetaplexor
): client is NFTStorageMetaplexor => 'storeNFTFromFilesystem' in client;

import { allocate, findInscriptionMetadataPda, initialize, MplInscription, writeData } from '@metaplex-foundation/mpl-inscription';
import {
  Cluster,
  createGenericFileFromJson,
  generateSigner,
  GenericFile,
  sol,
  SolAmount,
  Umi,
  UploaderInterface,
  addAmounts,
} from '@metaplex-foundation/umi';

const INSCRIPTION_GATEWAY = 'https://igw.metaplex.com';
const INSCRIPTION_METADATA_COST = sol(0.00152424);

export type InscriptionUploaderOptions = {
  cluster?: Cluster;
  concurrency?: number;
};

export function createInscriptionUploader(
  umi: Umi,
  options: InscriptionUploaderOptions = {}
): UploaderInterface {
  const uploadOne = async (file: GenericFile): Promise<string> => {
    umi.use(MplInscription());

    let network: string;
    switch (options.cluster ?? umi.rpc.getCluster()) {
      case 'devnet':
        network = 'devnet';
        break;
      case 'mainnet-beta':
        network = 'mainnet';
        break;
      default:
        throw new Error('Unknown network');
    }

    const inscriptionAccount = generateSigner(umi);
    const builder = initialize(umi, {
      inscriptionAccount
    });

    const numAllocs = Math.floor(file.buffer.length);
    const inscriptionMetadataAccount = findInscriptionMetadataPda(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
    });
    builder.add(new Array(numAllocs).fill(
      allocate(umi, {
        inscriptionAccount: inscriptionAccount.publicKey,
        inscriptionMetadataAccount,
        associatedTag: null,
        targetSize: file.buffer.length,
      })
    ));
    // await builder.sendAndConfirm(umi);

    const chunks = retrieveChunks(Buffer.from(file.buffer), 750);
    const promises = chunks.map((chunk, i) => 
      writeData(umi, {
        inscriptionAccount: inscriptionAccount.publicKey,
        inscriptionMetadataAccount,
        associatedTag: null,
        offset: i * 750,
        value: chunk
      }).sendAndConfirm(umi)
    );

    await Promise.all(promises);

    return `${INSCRIPTION_GATEWAY}/${network}/${inscriptionAccount.publicKey}`
  }

  const upload = async (files: GenericFile[]): Promise<string[]> =>
    Promise.all(files.map((file) => uploadOne(file)));

  const uploadJson = async <T>(json: T): Promise<string> =>
    uploadOne(createGenericFileFromJson<T>(json));

  const getUploadPrice = async (files: GenericFile[]): Promise<SolAmount> => {
    let cost = sol(0);
    await Promise.all(
      files.map(async (file) => {
        cost = addAmounts(cost, addAmounts(INSCRIPTION_METADATA_COST, await umi.rpc.getRent(file.buffer.length)));
      })
    );
    return cost;
  }

  return {
    upload,
    uploadJson,
    getUploadPrice,
  };
}

function retrieveChunks(bytes: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  return chunks;
}

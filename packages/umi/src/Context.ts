import { DownloaderInterface, NullDownloader } from './DownloaderInterface';
import { EddsaInterface, NullEddsa } from './EddsaInterface';
import { HttpInterface, NullHttp } from './HttpInterface';
import {
  NullProgramRepository,
  ProgramRepositoryInterface,
} from './ProgramRepositoryInterface';
import { NullRpc, RpcInterface } from './RpcInterface';
import { NullSerializer, SerializerInterface } from './SerializerInterface';
import { NullSigner, Signer } from './Signer';
import {
  NullTransactionFactory,
  TransactionFactoryInterface,
} from './TransactionFactoryInterface';
import { NullUploader, UploaderInterface } from './UploaderInterface';

/**
 * A Umi context object that uses all of the interfaces provided by Umi.
 * Once created, the end-user can pass this object to any function that
 * requires some or all of these interfaces.
 *
 * @category Interfaces
 */
export interface Context {
  downloader: DownloaderInterface;
  eddsa: EddsaInterface;
  http: HttpInterface;
  identity: Signer;
  payer: Signer;
  programs: ProgramRepositoryInterface;
  rpc: RpcInterface;
  serializer: SerializerInterface;
  transactions: TransactionFactoryInterface;
  uploader: UploaderInterface;
}

/**
 * A helper method that creates a Umi context object using only
 * Null implementations of the interfaces. This can be useful to
 * create a full Umi context object when only a few of the interfaces
 * are needed.
 *
 * @category Interfaces
 */
export const createNullContext = (): Context => ({
  downloader: new NullDownloader(),
  eddsa: new NullEddsa(),
  http: new NullHttp(),
  identity: new NullSigner(),
  payer: new NullSigner(),
  programs: new NullProgramRepository(),
  rpc: new NullRpc(),
  serializer: new NullSerializer(),
  transactions: new NullTransactionFactory(),
  uploader: new NullUploader(),
});

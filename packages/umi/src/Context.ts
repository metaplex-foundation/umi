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
  /** An interface for downloading files from URIs. */
  downloader: DownloaderInterface;
  /** An interface for managing public and private keys. */
  eddsa: EddsaInterface;
  /** An interface for sending HTTP requests. */
  http: HttpInterface;
  /** The signer using your app. */
  identity: Signer;
  /** The signer paying for things, usually the same as the `identity`. */
  payer: Signer;
  /** An interface for registering and retrieving programs. */
  programs: ProgramRepositoryInterface;
  /** An interface for sending RPC requests. */
  rpc: RpcInterface;
  /** An interface for serializing various types. */
  serializer: SerializerInterface;
  /** An interface for managing transactions. */
  transactions: TransactionFactoryInterface;
  /** An interface for uploading files and getting their URIs. */
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

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

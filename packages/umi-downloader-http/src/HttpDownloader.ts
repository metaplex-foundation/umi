import {
  Context,
  createGenericFile,
  DownloaderInterface,
  DownloaderOptions,
  GenericFile,
  request,
} from '@metaplex-foundation/umi';

export class HttpDownloader implements DownloaderInterface {
  constructor(protected context: Pick<Context, 'http'>) {}

  async downloadOne(
    uri: string,
    options: DownloaderOptions = {}
  ): Promise<GenericFile> {
    const response = await this.context.http.send(
      request().get(uri).withAbortSignal(options.signal)
    );
    return createGenericFile(response.body, uri);
  }

  async download(
    uris: string[],
    options: DownloaderOptions = {}
  ): Promise<GenericFile[]> {
    return Promise.all(uris.map((uri) => this.downloadOne(uri, options)));
  }

  async downloadJson<T>(
    uri: string,
    options: DownloaderOptions = {}
  ): Promise<T> {
    const response = await this.context.http.send<T>(
      request().get(uri).asJson().withAbortSignal(options.signal)
    );
    return response.data;
  }
}

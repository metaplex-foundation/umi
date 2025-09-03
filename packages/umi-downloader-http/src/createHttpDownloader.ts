import {
  Context,
  createGenericFile,
  DownloaderInterface,
  DownloaderOptions,
  GenericFile,
  request,
} from '@metaplex-foundation/umi';

export function createHttpDownloader(
  context: Pick<Context, 'http'>
): DownloaderInterface {
  const downloadOne = async (
    uri: string,
    options: DownloaderOptions = {}
  ): Promise<GenericFile> => {
    const response = await context.http.send(
      request().get(uri).withAbortSignal(options.signal)
    );
    return createGenericFile(response.body, uri);
  };

  const download = async (
    uris: string[],
    options: DownloaderOptions = {}
  ): Promise<GenericFile[]> =>
    Promise.all(uris.map((uri) => downloadOne(uri, options)));

  const downloadJson = async <T>(
    uri: string,
    options: DownloaderOptions = {}
  ): Promise<T> => {
    const response = await context.http.send<T>(
      request().get(uri).withAbortSignal(options.signal)
    );

    let json = response.data;
    if (typeof json === 'string')
      try {
        json = JSON.parse(response.body);
      } catch {
        console.warn(`could not parse response from ${uri} as json: ${json}`);
      }

    return json;
  };

  return { download, downloadJson };
}

import {
  Context,
  HttpInterface,
  HttpRequest,
  HttpResponse,
  createBaseUmi,
  createNullContext,
  utf8,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { createHttpDownloader, httpDownloader } from '../src';

/**
 * Creates a canned HTTP response for a given body.
 * The `data` attribute defaults to the parsed JSON body when possible.
 */
const createHttpResponse = (
  body: string,
  overrides: Partial<HttpResponse> = {}
): HttpResponse => {
  let data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    data = body;
  }
  return {
    data,
    body,
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {},
    ...overrides,
  };
};

/**
 * Creates a context with a mocked HTTP interface that records
 * all received requests and responds using the given handler.
 */
const createMockContext = (
  handler: (request: HttpRequest) => HttpResponse
): { context: Pick<Context, 'http'>; requests: HttpRequest[] } => {
  const requests: HttpRequest[] = [];
  const http: HttpInterface = {
    send: async <ResponseData>(
      request: HttpRequest
    ): Promise<HttpResponse<ResponseData>> => {
      requests.push(request);
      return handler(request) as HttpResponse<ResponseData>;
    },
  };
  return { context: { ...createNullContext(), http }, requests };
};

test('it downloads a single file using a GET request on its URI', async (t) => {
  // Given a downloader using a mocked HTTP interface.
  const { context, requests } = createMockContext(() =>
    createHttpResponse('some content')
  );
  const downloader = createHttpDownloader(context);

  // When we download a file from a given URI.
  const uri = 'https://example.com/my-file.txt';
  const [file] = await downloader.download([uri]);

  // Then we get a generic file named after its URI with the response body as content.
  t.is(file.fileName, uri);
  t.is(file.displayName, uri);
  t.deepEqual(file.buffer, utf8.serialize('some content'));

  // And exactly one GET request was sent to that URI.
  t.is(requests.length, 1);
  t.is(requests[0].method, 'get');
  t.is(requests[0].url, uri);
});

test('it downloads multiple files whilst keeping their order', async (t) => {
  // Given a mocked HTTP interface that responds based on the requested URL.
  const { context, requests } = createMockContext((request) =>
    createHttpResponse(`content of ${request.url}`)
  );
  const downloader = createHttpDownloader(context);

  // When we download multiple URIs at once.
  const uriA = 'https://example.com/file-a.txt';
  const uriB = 'https://example.com/file-b.txt';
  const uriC = 'https://example.com/file-c.txt';
  const files = await downloader.download([uriA, uriB, uriC]);

  // Then we get one file per URI, in the same order.
  t.is(files.length, 3);
  t.deepEqual(
    files.map((file) => file.fileName),
    [uriA, uriB, uriC]
  );
  t.deepEqual(files[0].buffer, utf8.serialize(`content of ${uriA}`));
  t.deepEqual(files[1].buffer, utf8.serialize(`content of ${uriB}`));
  t.deepEqual(files[2].buffer, utf8.serialize(`content of ${uriC}`));

  // And one request was sent per URI.
  t.deepEqual(
    requests.map((request) => request.url),
    [uriA, uriB, uriC]
  );
  t.true(requests.every((request) => request.method === 'get'));
});

test('it downloads and parses JSON files', async (t) => {
  // Given a mocked HTTP interface returning a JSON body.
  const json = { name: 'Umi', awesome: true, versions: [1, 2, 3] };
  const { context, requests } = createMockContext(() =>
    createHttpResponse(JSON.stringify(json))
  );
  const downloader = createHttpDownloader(context);

  // When we download that URI as JSON.
  const uri = 'https://example.com/metadata.json';
  const result = await downloader.downloadJson<typeof json>(uri);

  // Then we get the parsed JSON object back.
  t.deepEqual(result, json);

  // And a single GET request was sent to that URI.
  t.is(requests.length, 1);
  t.is(requests[0].method, 'get');
  t.is(requests[0].url, uri);
});

test('it forwards abort signals to the HTTP interface', async (t) => {
  // Given a downloader using a mocked HTTP interface.
  const { context, requests } = createMockContext(() =>
    createHttpResponse('some content')
  );
  const downloader = createHttpDownloader(context);

  // When we download a file with an explicit abort signal.
  const abortController = new AbortController();
  await downloader.download(['https://example.com/my-file.txt'], {
    signal: abortController.signal,
  });

  // Then the signal was attached to the outgoing request.
  t.is(requests[0].signal, abortController.signal);
});

test('it propagates errors thrown by the HTTP interface', async (t) => {
  // Given a mocked HTTP interface that always fails.
  const error = new Error('Request failed with status code 404');
  const { context } = createMockContext(() => {
    throw error;
  });
  const downloader = createHttpDownloader(context);

  // When we try to download a file, then the error is propagated.
  await t.throwsAsync(downloader.download(['https://example.com/nope.txt']), {
    is: error,
  });

  // And the same goes for JSON downloads.
  await t.throwsAsync(downloader.downloadJson('https://example.com/nope.json'), {
    is: error,
  });
});

test('it returns the raw body of unsuccessful responses that did not throw', async (t) => {
  // Given a mocked HTTP interface returning a non-ok response
  // instead of throwing — e.g. a fetch-like implementation.
  const { context } = createMockContext(() =>
    createHttpResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' })
  );
  const downloader = createHttpDownloader(context);

  // When we download a file, then the downloader does not check the
  // `ok` flag and simply wraps the response body in a generic file.
  const [file] = await downloader.download(['https://example.com/nope.txt']);
  t.deepEqual(file.buffer, utf8.serialize('Not Found'));
});

test('it can be installed as a plugin using the current HTTP interface', async (t) => {
  // Given a base Umi instance using the HTTP downloader plugin.
  const umi = createBaseUmi().use(httpDownloader());

  // And a mocked HTTP interface installed afterwards.
  const { context, requests } = createMockContext(() =>
    createHttpResponse('plugin content')
  );
  umi.http = context.http;

  // When we download a file using the downloader interface.
  const uri = 'https://example.com/plugin.txt';
  const [file] = await umi.downloader.download([uri]);

  // Then the file was downloaded using the mocked HTTP interface.
  t.deepEqual(file.buffer, utf8.serialize('plugin content'));
  t.is(requests.length, 1);
  t.is(requests[0].url, uri);
});

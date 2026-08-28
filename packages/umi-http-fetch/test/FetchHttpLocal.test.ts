import test from 'ava';
import { HttpRequest, request } from '@metaplex-foundation/umi';
import { createFetchHttp } from '../src';
import { LocalHttpServer, startLocalHttpServer } from './_localHttpServer';

let server: LocalHttpServer;

test.before(async () => {
  server = await startLocalHttpServer();
});

test.after.always(async () => {
  if (server) await server.close();
});

type Echo = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
};

test.serial('it can send requests with various HTTP methods', async (t) => {
  const http = createFetchHttp();

  const putResponse = await http.send<Echo>(
    request().put(`${server.endpoint}/echo`).asJson()
  );
  t.is(putResponse.data.method, 'PUT');

  const patchResponse = await http.send<Echo>(
    request().patch(`${server.endpoint}/echo`).asJson()
  );
  t.is(patchResponse.data.method, 'PATCH');

  const deleteResponse = await http.send<Echo>(
    request().delete(`${server.endpoint}/echo`).asJson()
  );
  t.is(deleteResponse.data.method, 'DELETE');
});

test.serial('it can send a request without any headers', async (t) => {
  const http = createFetchHttp();
  const rawRequest = {
    method: 'get',
    url: `${server.endpoint}/echo`,
    data: undefined,
    headers: undefined,
  } as unknown as HttpRequest;

  const response = await http.send<Echo>(rawRequest);
  t.true(response.ok);
  t.is(response.data.method, 'GET');
});

test.serial('it lowercases custom headers and joins array values', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<Echo>(
    request()
      .get(`${server.endpoint}/echo`)
      .withHeader('X-Single', 'ONE')
      .withHeader('X-Multi', ['A', 'B'])
  );

  t.true(response.ok);
  t.is(response.data.headers['x-single'], 'one');
  t.is(response.data.headers['x-multi'], 'a, b');
});

test.serial('it sends a string body as-is for non-JSON requests', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<Echo>(
    request()
      .post(`${server.endpoint}/echo`)
      .contentType('text/plain')
      .withData('raw string body')
  );

  t.true(response.ok);
  t.is(response.data.body, 'raw string body');
});

test.serial('it sends bytes as-is for non-JSON requests', async (t) => {
  const http = createFetchHttp();
  const bytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
  const response = await http.send<Echo>(
    request()
      .post(`${server.endpoint}/echo`)
      .contentType('application/octet-stream')
      .withData(bytes)
  );

  t.true(response.ok);
  t.is(response.data.body, 'hello');
});

test.serial('it JSON-stringifies data for JSON requests', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<Echo>(
    request()
      .post(`${server.endpoint}/echo`)
      .asJson()
      .withData({ name: 'Alice', age: 30 })
  );

  t.true(response.ok);
  t.is(response.data.body, '{"name":"Alice","age":30}');
  t.is(response.data.headers['content-type'], 'application/json');
});

test.serial(
  'it returns text as data for non-JSON responses',
  async (t) => {
    const http = createFetchHttp();
    const response = await http.send<string>(
      request().get(`${server.endpoint}/text`)
    );

    t.true(response.ok);
    t.is(response.data, 'plain text response');
    t.is(response.body, 'plain text response');
    t.is(response.headers['content-type'], 'text/plain');
  }
);

test.serial(
  'it returns text as data when no content type is provided',
  async (t) => {
    const http = createFetchHttp();
    const response = await http.send<string>(
      request().get(`${server.endpoint}/no-content-type`)
    );

    t.true(response.ok);
    t.is(response.data, 'no content type here');
  }
);

test.serial(
  'it falls back to the response text for a JSON null body',
  async (t) => {
    const http = createFetchHttp();
    const response = await http.send<unknown>(
      request().get(`${server.endpoint}/json-null`)
    );

    t.true(response.ok);
    // JSON.parse('null') is null, so the `?? bodyAsText`
    // fallback kicks in and returns the raw text instead.
    t.is(response.data, 'null');
    t.is(response.body, 'null');
  }
);

test.serial('it exposes non-2xx responses without throwing', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<string>(
    request().get(`${server.endpoint}/status/500`)
  );

  t.false(response.ok);
  t.is(response.status, 500);
  t.is(response.statusText, 'Internal Server Error');
  t.is(response.data, 'status 500');
});

test.serial('it can follow redirects', async (t) => {
  const http = createFetchHttp();
  const response = await http.send<string>(
    request().get(`${server.endpoint}/redirect`).followRedirects(5)
  );

  t.true(response.ok);
  t.is(response.status, 200);
  t.is(response.data, 'plain text response');
});

test.serial('it fails when redirects are not allowed', async (t) => {
  const http = createFetchHttp();
  await t.throwsAsync(
    () =>
      http.send<string>(
        request().get(`${server.endpoint}/redirect`).dontFollowRedirects()
      ),
    { message: /maximum redirect reached/ }
  );
});

test.serial('it can time out a slow request', async (t) => {
  const http = createFetchHttp();
  await t.throwsAsync(
    () =>
      http.send<string>(
        request().get(`${server.endpoint}/slow`).withTimeout(50)
      ),
    { message: /network timeout/ }
  );
});

test.serial('it can abort a request with an abort signal', async (t) => {
  const http = createFetchHttp();
  const controller = new AbortController();
  const promise = http.send<string>(
    request()
      .get(`${server.endpoint}/slow`)
      .withAbortSignal(controller.signal)
  );
  controller.abort();

  const error = (await t.throwsAsync(() => promise)) as Error;
  t.is(error.name, 'AbortError');
});

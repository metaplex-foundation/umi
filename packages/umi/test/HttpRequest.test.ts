import test from 'ava';
import { request } from '../src';

test('it creates an empty GET request by default', (t) => {
  const req = request();
  t.is(req.method, 'get');
  t.is(req.url, '');
  t.is(req.data, undefined);
  t.deepEqual(req.headers, {});
  t.is(req.maxRedirects, undefined);
  t.is(req.timeout, undefined);
  t.is(req.signal, undefined);
});

test('it can set the endpoint using method helpers', (t) => {
  t.is(request().get('https://example.com/a').method, 'get');
  t.is(request().get('https://example.com/a').url, 'https://example.com/a');
  t.is(request().post('https://example.com/b').method, 'post');
  t.is(request().put('https://example.com/c').method, 'put');
  t.is(request().patch('https://example.com/d').method, 'patch');
  t.is(request().delete('https://example.com/e').method, 'delete');
});

test('it can set a custom endpoint', (t) => {
  const req = request().withEndpoint('HEAD', 'https://example.com/head');
  t.is(req.method, 'HEAD');
  t.is(req.url, 'https://example.com/head');
});

test('it can set content types using helpers', (t) => {
  t.deepEqual(request().asJson().headers, {
    'content-type': 'application/json',
  });
  t.deepEqual(request().asMultipart().headers, {
    'content-type': 'multipart/form-data',
  });
  t.deepEqual(request().asForm().headers, {
    'content-type': 'application/x-www-form-urlencoded',
  });
  t.deepEqual(request().contentType('text/plain').headers, {
    'content-type': 'text/plain',
  });
});

test('it can set accept and user-agent headers', (t) => {
  t.deepEqual(request().accept('application/json').headers, {
    accept: 'application/json',
  });
  t.deepEqual(request().userAgent('umi-tests').headers, {
    'user-agent': 'umi-tests',
  });
});

test('it can set an authorization token', (t) => {
  t.deepEqual(request().withToken('my-token').headers, {
    authorization: 'Bearer my-token',
  });
  t.deepEqual(request().withToken('my-token', 'Basic').headers, {
    authorization: 'Basic my-token',
  });
});

test('it can add and merge custom headers', (t) => {
  const req = request()
    .withHeader('x-first', 'A')
    .withHeaders({ 'x-second': 'B', 'x-third': 'C' })
    .withHeader('x-first', 'Z');
  t.deepEqual(req.headers, { 'x-first': 'Z', 'x-second': 'B', 'x-third': 'C' });
});

test('it can configure redirects', (t) => {
  t.is(request().followRedirects(5).maxRedirects, 5);
  t.is(request().dontFollowRedirects().maxRedirects, 0);
  t.is(request().followRedirects().maxRedirects, undefined);
});

test('it can configure timeouts', (t) => {
  t.is(request().withTimeout(5000).timeout, 5000);
  t.is(request().withoutTimeout().timeout, 0);
  t.is(request().withTimeout().timeout, undefined);
});

test('it can set an abort signal', (t) => {
  const controller = new AbortController();
  const req = request().withAbortSignal(controller.signal);
  t.is(req.signal, controller.signal);
  t.is(request().withAbortSignal().signal, undefined);
});

test('it can set data on the request', (t) => {
  const req = request()
    .post('https://example.com')
    .withData({ name: 'Alice' });
  t.deepEqual(req.data, { name: 'Alice' });
});

test('it can append query parameters from a record', (t) => {
  const req = request()
    .get('https://example.com/path')
    .withParams({ foo: 'bar', baz: '42' });
  t.is(req.url, 'https://example.com/path?foo=bar&baz=42');
});

test('it can append query parameters from a string and URLSearchParams', (t) => {
  const fromString = request()
    .get('https://example.com/')
    .withParams('a=1&b=2');
  t.is(fromString.url, 'https://example.com/?a=1&b=2');

  const fromSearchParams = request()
    .get('https://example.com/')
    .withParams(new URLSearchParams({ c: '3' }));
  t.is(fromSearchParams.url, 'https://example.com/?c=3');
});

test('it preserves existing query parameters when adding new ones', (t) => {
  const req = request()
    .get('https://example.com/path?existing=yes')
    .withParams({ added: 'also' });
  t.is(req.url, 'https://example.com/path?existing=yes&added=also');
});

test('it is immutable: each method returns a new builder', (t) => {
  const base = request().get('https://example.com');
  const withHeader = base.withHeader('x-key', 'value');
  t.not(base, withHeader);
  t.deepEqual(base.headers, {});
  t.deepEqual(withHeader.headers, { 'x-key': 'value' });
});

test('it can chain a full request configuration', (t) => {
  const controller = new AbortController();
  const req = request()
    .post('https://example.com/api')
    .withParams({ page: '2' })
    .asJson()
    .accept('application/json')
    .withToken('token')
    .withTimeout(1000)
    .followRedirects(3)
    .withAbortSignal(controller.signal)
    .withData({ hello: 'world' });

  t.is(req.method, 'post');
  t.is(req.url, 'https://example.com/api?page=2');
  t.deepEqual(req.headers, {
    'content-type': 'application/json',
    accept: 'application/json',
    authorization: 'Bearer token',
  });
  t.is(req.timeout, 1000);
  t.is(req.maxRedirects, 3);
  t.is(req.signal, controller.signal);
  t.deepEqual(req.data, { hello: 'world' });
});

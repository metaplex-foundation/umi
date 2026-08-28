import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';

export type RecordedRequest = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

export type LocalHttpServer = {
  endpoint: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
};

/**
 * A minimal local HTTP server used to test the fetch-based
 * HTTP interface without network access. It records every
 * request and serves a few fixed routes:
 *
 * - `/echo` responds with a JSON echo of the request.
 * - `/text` responds with a plain text body.
 * - `/json-null` responds with a JSON `null` body.
 * - `/no-content-type` responds without a content-type header.
 * - `/redirect` redirects to `/text`.
 * - `/slow` waits 500ms before responding.
 * - `/status/<code>` responds with the given status code.
 */
export const startLocalHttpServer = async (): Promise<LocalHttpServer> => {
  const requests: RecordedRequest[] = [];

  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      requests.push({
        method: request.method ?? '',
        url: request.url ?? '',
        headers: { ...request.headers },
        body,
      });

      const url = request.url ?? '';
      if (url.startsWith('/echo')) {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            method: request.method,
            url,
            headers: request.headers,
            body,
          })
        );
      } else if (url.startsWith('/text')) {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('plain text response');
      } else if (url.startsWith('/json-null')) {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('null');
      } else if (url.startsWith('/no-content-type')) {
        response.writeHead(200);
        response.end('no content type here');
      } else if (url.startsWith('/redirect')) {
        response.writeHead(302, { location: '/text' });
        response.end();
      } else if (url.startsWith('/slow')) {
        setTimeout(() => {
          response.writeHead(200, { 'content-type': 'text/plain' });
          response.end('slow response');
        }, 500);
      } else if (url.startsWith('/status/')) {
        const status = Number(url.split('/')[2]);
        response.writeHead(status, { 'content-type': 'text/plain' });
        response.end(`status ${status}`);
      } else {
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ message: 'Not found' }));
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;

  return {
    endpoint: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

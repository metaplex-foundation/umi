import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';

export type RecordedRequest = {
  method: string;
  params: unknown;
  id: unknown;
};

export type MockJsonRpcServer = {
  endpoint: string;
  requests: RecordedRequest[];
  lastRequest: (method: string) => RecordedRequest | undefined;
  respond: (method: string, handler: (params: unknown) => unknown) => void;
  fail: (
    method: string,
    error: { code: number; message: string; data?: unknown }
  ) => void;
  close: () => Promise<void>;
};

/**
 * A minimal local JSON-RPC 2.0 server standing in for a Solana RPC
 * node, so the RPC interface can be tested without a validator or
 * network access. Register per-method result handlers with `respond`
 * or JSON-RPC errors with `fail`; every request is recorded for
 * assertions on the exact wire parameters.
 */
export const startMockJsonRpcServer = async (): Promise<MockJsonRpcServer> => {
  const handlers = new Map<string, (params: unknown) => unknown>();
  const failures = new Map<
    string,
    { code: number; message: string; data?: unknown }
  >();
  const requests: RecordedRequest[] = [];

  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const single = Array.isArray(body) ? body[0] : body;
      requests.push({
        method: single.method,
        params: single.params,
        id: single.id,
      });

      const reply = (payload: object) => {
        const message = JSON.stringify({
          jsonrpc: '2.0',
          id: single.id,
          ...payload,
        });
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(Array.isArray(body) ? `[${message}]` : message);
      };

      const failure = failures.get(single.method);
      if (failure) {
        reply({ error: failure });
        return;
      }
      const handler = handlers.get(single.method);
      if (!handler) {
        reply({
          error: { code: -32601, message: `Method not found: ${single.method}` },
        });
        return;
      }
      reply({ result: handler(single.params) });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;

  return {
    endpoint: `http://127.0.0.1:${port}`,
    requests,
    lastRequest: (method) =>
      [...requests].reverse().find((r) => r.method === method),
    respond: (method, handler) => {
      handlers.set(method, handler);
    },
    fail: (method, error) => {
      failures.set(method, error);
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

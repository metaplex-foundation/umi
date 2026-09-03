import { UmiError } from '@metaplex-foundation/umi';

/** The error object of a JSON-RPC response. */
export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

/**
 * A JSON-RPC error returned by the node, as rejected by `rpc.call` and
 * the methods built on it. `logs` is set when the node reports program
 * logs in `data`, as it does for failed transaction simulations.
 */
export class RpcError extends UmiError {
  readonly name: string = 'RpcError';

  readonly code: number;

  readonly data?: unknown;

  readonly logs?: string[];

  constructor(error: JsonRpcError) {
    super(error.message, 'rpc');
    this.code = error.code;
    this.data = error.data;
    const logs = (error.data as { logs?: unknown } | null | undefined)?.logs;
    if (Array.isArray(logs)) {
      this.logs = logs;
    }
  }
}

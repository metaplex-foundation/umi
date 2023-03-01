import type { HttpResponseHeaders } from './HttpHeaders';

export type HttpResponse<D = any> = {
  data: D;
  body: string;
  ok: boolean;
  status: number;
  statusText: string;
  headers: HttpResponseHeaders;
};

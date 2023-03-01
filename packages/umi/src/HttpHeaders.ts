export type HttpHeaderValue = string | string[];

export type HttpHeaderContentTypeValue =
  | HttpHeaderValue
  | 'text/html'
  | 'text/plain'
  | 'multipart/form-data'
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'application/octet-stream';

export type HttpHeaders = Record<string, HttpHeaderValue>;

export type HttpRequestHeaders = HttpHeaders & {
  accept?: HttpHeaderValue;
  authorization?: HttpHeaderValue;
  'content-encoding'?: HttpHeaderValue;
  'content-length'?: HttpHeaderValue;
  'content-type'?: HttpHeaderContentTypeValue;
  'user-agent'?: HttpHeaderValue;
};

export type HttpResponseHeaders = HttpHeaders & {
  server?: HttpHeaderValue;
  'cache-control'?: HttpHeaderValue;
  'content-encoding'?: HttpHeaderValue;
  'content-length'?: HttpHeaderValue;
  'content-type'?: HttpHeaderContentTypeValue;
};

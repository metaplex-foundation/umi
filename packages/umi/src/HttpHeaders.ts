/**
 * Represents a HTTP header value.
 * @category Interfaces — Http
 */
export type HttpHeaderValue = string | string[];

/**
 * Represents the value of the Content-Type header.
 * @category Interfaces — Http
 */
export type HttpHeaderContentTypeValue =
  | HttpHeaderValue
  | 'text/html'
  | 'text/plain'
  | 'multipart/form-data'
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'application/octet-stream';

/**
 * Represents a set of HTTP headers.
 * @category Interfaces — Http
 */
export type HttpHeaders = Record<string, HttpHeaderValue>;

/**
 * Represents a set of HTTP Request headers.
 * @category Interfaces — Http
 */
export type HttpRequestHeaders = HttpHeaders & {
  accept?: HttpHeaderValue;
  authorization?: HttpHeaderValue;
  'content-encoding'?: HttpHeaderValue;
  'content-length'?: HttpHeaderValue;
  'content-type'?: HttpHeaderContentTypeValue;
  'user-agent'?: HttpHeaderValue;
};

/**
 * Represents a set of HTTP Response headers.
 * @category Interfaces — Http
 */
export type HttpResponseHeaders = HttpHeaders & {
  server?: HttpHeaderValue;
  'cache-control'?: HttpHeaderValue;
  'content-encoding'?: HttpHeaderValue;
  'content-length'?: HttpHeaderValue;
  'content-type'?: HttpHeaderContentTypeValue;
};

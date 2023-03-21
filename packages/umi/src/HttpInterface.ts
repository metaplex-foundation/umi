import { InterfaceImplementationMissingError } from './errors';
import { HttpRequest } from './HttpRequest';
import { HttpResponse } from './HttpResponse';

/**
 * TODO
 *
 * @category Interfaces
 */
export interface HttpInterface {
  send: <ResponseData, RequestData = any>(
    request: HttpRequest<RequestData>
  ) => Promise<HttpResponse<ResponseData>>;
}

export class NullHttp implements HttpInterface {
  send<ResponseData>(): Promise<HttpResponse<ResponseData>> {
    throw new InterfaceImplementationMissingError('HttpInterface', 'http');
  }
}

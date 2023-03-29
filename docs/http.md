# Sending Http requests

Umi provides a simple `HttpInterface` that can be used to send HTTP requests. This allows any Umi plugin or third-party library to rely on whichever Http client the end-user chooses to use instead of ending up with multiple Http clients in the same project.

The `HttpInterface` only defines a single method `send` which accepts a generic `HttpRequest<T>` and returns a generic `HttpResponse<U>` such that `T` and `U` are the request and response body types respectively.

Umi defines various Http-related types such as `HttpHeaders` and `HttpMethod` that are used by the `HttpRequest` and `HttpResponse` types. In order to improve the developer experience around sending requests, Umi ships with a little request builder that can be used to create `HttpRequest` instances. You may want to check the [API references of the `HttpRequestBuilder` type](https://umi-docs.vercel.app/classes/umi.HttpRequestBuilder.html) to learn more about it but here are some examples:

```ts
// GET JSON request.
await umi.http.send(request().get('https://example.com/users/1').asJson());

// POST Form request.
const data = { name: 'John Doe', email: 'john.doe@example.com' };
await umi.http.send(request().post('https://example.com/users').asForm().withData(data));

// PUT request with bearer token.
await umi.http.send(request().put('https://example.com/users/1').withToken('my-token'));

// GET request with abort signal
await umi.http.send(request().get('https://example.com/users').withAbortSignal(mySignal));
```

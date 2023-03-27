# Uploading and downloading assets

Umi enables us to upload and download any file via the [`UploaderInterface`](https://umi-docs.vercel.app/interfaces/umi.UploaderInterface.html) and [`DownloaderInterface`](https://umi-docs.vercel.app/interfaces/umi.DownloaderInterface.html) interfaces respectively.

## Generic files

Because the definition of a file varies between libraries and whether we are in the browser or in a Node server, Umi defines a type called `GenericFile` to so we can agree on a common type for files.

```ts
type GenericFile = {
  readonly buffer: Uint8Array;
  readonly fileName: string;
  readonly displayName: string;
  readonly uniqueName: string;
  readonly contentType: string | null;
  readonly extension: string | null;
  readonly tags: GenericFileTag[];
};
```

As you can see, its content is stored as a `Uint8Array` buffer and it includes some metadata such as its filename, its display name, its content type, etc. It also includes a simple key-value storage to store any additional data as tags. These can also be used to pass additional information about the file to the uploader.

You can use the `createGenericFile` helper function to create a new `GenericFile` instance from its content and filename. To help us convert a file from a specific environment to and from a `GenericFile`, Umi also provides some additional helper methods.

```ts
// Create a generic file directly.
createGenericFile('some content', 'my-file.txt');

// Parse a generic file to and from a browser file.
await createGenericFileFromBrowserFile(myBrowserFile);
createBrowserFileFromGenericFile(myGenericFile);

// Parse a generic file to and from a JSON object.
createGenericFileFromJson(myJson);
parseJsonFromGenericFile(myGenericFile);
```


## The uploader interface

_Coming soon..._

## The downloader interface

_Coming soon..._

## The mock storage

_Coming soon..._

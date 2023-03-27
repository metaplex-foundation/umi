# Uploading and downloading assets

Umi enables us to upload and download any file via the [`UploaderInterface`](https://umi-docs.vercel.app/interfaces/umi.UploaderInterface.html) and [`DownloaderInterface`](https://umi-docs.vercel.app/interfaces/umi.DownloaderInterface.html) interfaces respectively.

## Generic files

Because the definition of a file varies between libraries and whether we are in the browser or a Node server, Umi defines a type called `GenericFile` so we can agree on a common type for files.

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

First and foremost, the `UploaderInterface` provides an `upload` method that can be used to upload one or several files at once. It returns an array of URIs that represent the uploaded files in the order in which they were passed.

```ts
const [myUri, myOtherUri] = await umi.uploader.upload([myFile, myOtherFile]);
```

 The `upload` method also accepts some options to configure the upload process such as an abort `signal` to cancel the upload or an `onProgress` callback to track the upload progress. Note that these may not be supported by all uploaders.

```ts
const myUris = await umi.uploader.upload(myFiles, {
  signal: myAbortSignal,
  onProgress: (percent) => {
    console.log(`${percent * 100}% uploaded...`);
  },
})
```

The `UploaderInterface` also provides a `uploadJson` method that converts a JSON object into a file and uploads it.

```ts
const myUri = await umi.uploader.uploadJson({ name: 'John', age: 42 });
```

Finally, if an uploader charges an amount to store a set of files, you may find out how much it will cost by using the `getUploadPrice` method. It will return a custom `Amount` object which can be in any currency and unit.

```ts
const price = await umi.uploader.getUploadPrice(myFiles);
```

## The downloader interface

Reciprocally, the `DownloaderInterface` provides a `download` method that can be used to download one or several files at once and a `downloadJson` method that can be used to download a parsed JSON file. Both of these methods can be cancelled via an abort `signal`.

```ts
// Download one or several files.
const [myFile, myOtherFile] = await umi.downloader.download([myUri, myOtherUri]);

// Download using an abort signal.
const myFiles = await umi.downloader.download(myUris, { signal: myAbortSignal });

// Download a JSON file.
type Person = { name: string; age: number; };
const myJsonObject = await umi.downloader.downloadJson<Person>(myUri);
```

## The mock storage

Umi provides a mock storage helper class that acts as both an uploader and a downloader. It can be used to test your application without having to set up a real storage service. Anything that is uploaded to the mock storage will be cached in memory such that it can be downloaded later on.

The mock storage helper is available as a [standalone package](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-storage-mock) and must be installed separately.

```sh
npm install @metaplex-foundation/umi-storage-mock
```

Then, we can register the plugin it provides to our Umi instance and start using it.

```ts
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';

umi.use(mockStorage());
const [myUri] = await umi.uploader.upload([myFile]);
const [myDownloadedFile] = await umi.downloader.download([myUri]);
// myFile and myDownloadedFile are identical.
```

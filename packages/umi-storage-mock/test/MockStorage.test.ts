import {
  createBaseUmi,
  createGenericFile,
  sol,
  utf8,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { AssetNotFoundError, createMockStorage, mockStorage } from '../src';

test('it can upload a file and download it back', async (t) => {
  // Given a mock storage and a generic file.
  const storage = createMockStorage();
  const file = createGenericFile('some content', 'my-file.txt');

  // When we upload that file and download it back from its URI.
  const [uri] = await storage.upload([file]);
  const [downloaded] = await storage.download([uri]);

  // Then we get the exact same file back, byte for byte.
  t.deepEqual(downloaded, file);
  t.deepEqual(downloaded.buffer, utf8.serialize('some content'));
});

test('it can upload and download multiple files whilst keeping their order', async (t) => {
  // Given a mock storage and several generic files.
  const storage = createMockStorage();
  const fileA = createGenericFile('content A', 'file-a.txt');
  const fileB = createGenericFile(new Uint8Array([1, 2, 3]), 'file-b.bin');
  const fileC = createGenericFile('content C', 'file-c.txt');

  // When we upload all of them at once.
  const uris = await storage.upload([fileA, fileB, fileC]);
  t.is(uris.length, 3);

  // And download them back using their URIs.
  const downloaded = await storage.download(uris);

  // Then we get the same files back, in the same order.
  t.deepEqual(downloaded, [fileA, fileB, fileC]);
});

test('it creates URLs using the default base URL and the unique name of the file', async (t) => {
  // Given a mock storage using the default base URL.
  const storage = createMockStorage();

  // When we upload a file with an explicit unique name.
  const file = createGenericFile('some content', 'my-file.txt', {
    uniqueName: 'my-unique-name',
  });
  const [uri] = await storage.upload([file]);

  // Then the URI is the default base URL followed by the unique name.
  t.is(uri, 'https://mockstorage.example.com/my-unique-name');
});

test('it can create URLs using a custom base URL', async (t) => {
  // Given a mock storage using a custom base URL.
  const storage = createMockStorage({ baseUrl: 'https://example.org/assets/' });

  // When we upload a file with an explicit unique name.
  const file = createGenericFile('some content', 'my-file.txt', {
    uniqueName: 'my-unique-name',
  });
  const [uri] = await storage.upload([file]);

  // Then the URI uses the custom base URL.
  t.is(uri, 'https://example.org/assets/my-unique-name');

  // And the file can be downloaded back from that URI.
  const [downloaded] = await storage.download([uri]);
  t.deepEqual(downloaded, file);
});

test('it can upload and download JSON objects', async (t) => {
  // Given a mock storage and a JSON object.
  const storage = createMockStorage();
  const json = { name: 'John Doe', age: 42, tags: ['a', 'b'] };

  // When we upload it as JSON and download it back as JSON.
  const uri = await storage.uploadJson(json);
  const downloaded = await storage.downloadJson<typeof json>(uri);

  // Then we get the same object back.
  t.deepEqual(downloaded, json);
});

test('it costs nothing to upload files', async (t) => {
  // Given a mock storage.
  const storage = createMockStorage();

  // When we get the price of any upload.
  const price = await storage.getUploadPrice([
    createGenericFile('some content', 'my-file.txt'),
  ]);

  // Then it is free.
  t.deepEqual(price, sol(0));
});

test('it fails to download a file that was never uploaded', async (t) => {
  // Given a mock storage with no uploaded files.
  const storage = createMockStorage();

  // When we try to download a file from a URI that was never uploaded.
  const promise = storage.download(['https://mockstorage.example.com/nope']);

  // Then we expect an AssetNotFoundError mentioning that URI.
  await t.throwsAsync(promise, {
    instanceOf: AssetNotFoundError,
    message: /https:\/\/mockstorage\.example\.com\/nope/,
  });
});

test('it fails to download a JSON object that was never uploaded', async (t) => {
  // Given a mock storage with no uploaded files.
  const storage = createMockStorage();

  // When we try to download a JSON file that was never uploaded.
  const promise = storage.downloadJson('https://mockstorage.example.com/nope');

  // Then we expect an AssetNotFoundError.
  await t.throwsAsync(promise, { instanceOf: AssetNotFoundError });
});

test('it can be installed as a plugin providing both an uploader and a downloader', async (t) => {
  // Given a base Umi instance using the mock storage plugin.
  const umi = createBaseUmi().use(mockStorage());

  // When we upload a file using the uploader interface.
  const file = createGenericFile('plugin content', 'plugin.txt');
  const [uri] = await umi.uploader.upload([file]);

  // Then we can download it back using the downloader interface,
  // proving both interfaces share the same underlying storage.
  const [downloaded] = await umi.downloader.download([uri]);
  t.deepEqual(downloaded, file);

  // And JSON uploads also round-trip across both interfaces.
  const jsonUri = await umi.uploader.uploadJson({ hello: 'world' });
  t.deepEqual(await umi.downloader.downloadJson(jsonUri), { hello: 'world' });
});

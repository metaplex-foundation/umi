import {
  Context,
  createGenericFile,
  createUmi,
  generatedSignerIdentity,
  utf8,
} from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import test from 'ava';
import { cascadeUploader, CascadeUploaderOptions } from '../src';

test('example test', async (t) => {
  t.is(typeof cascadeUploader, 'function');
});

// TODO(loris): Unskip these tests when we can mock the NFT Storage API.

const getContext = (options?: CascadeUploaderOptions): Context =>
  createUmi().use({
    install(umi) {
      umi.use(web3JsRpc('https://api.devnet.solana.com'));
      umi.use(web3JsEddsa());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(generatedSignerIdentity());
      umi.use(cascadeUploader(options));
    },
  });
// Use a dummy apiKey since the tests are skipped currently.
const apiKey = 'testKey';

test.skip('it can upload one file', async (t) => {
  // Given a Context using NFT.Storage.
  const context = getContext({ apiKey });

  // When we upload some asset.
  const [uri] = await context.uploader.upload([
    createGenericFile('some-image', 'some-image.jpg'),
  ]);

  // Then the URI should be a valid IPFS URI.
  t.truthy(uri);
  t.true(uri.startsWith('https://ipfs.io/'));

  // and it should point to the uploaded asset.
  const [asset] = await context.downloader.download([uri]);
  t.is(utf8.deserialize(asset.buffer)[0], 'some-image');
});

test.skip('it can upload multiple files in batch', async (t) => {
  // Given a Context using NFT.Storage with a batch size of 1.
  const context = getContext({ apiKey });

  // When we upload two assets.
  const uris = await context.uploader.upload([
    createGenericFile('some-image-A', 'some-image-A.jpg'),
    createGenericFile('some-image-B', 'some-image-B.jpg'),
  ]);

  // Then the URIs should point to the uploaded assets in the right order.
  t.is(uris.length, 2);
  const [assetA] = await context.downloader.download([uris[0]]);
  t.is(utf8.deserialize(assetA.buffer)[0], 'some-image-A');
  const [assetB] = await context.downloader.download([uris[1]]);
  t.is(utf8.deserialize(assetB.buffer)[0], 'some-image-B');
});

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
import { nftStorageUploader, NftStorageUploaderOptions } from '../src';

test('example test', async (t) => {
  t.is(typeof nftStorageUploader, 'function');
});

// TODO(loris): Unskip these tests when we can mock the NFT Storage API.

const getContext = (options?: NftStorageUploaderOptions): Context =>
  createUmi().use({
    install(umi) {
      umi.use(web3JsRpc('https://metaplex.devnet.rpcpool.com/'));
      umi.use(web3JsEddsa());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(generatedSignerIdentity());
      umi.use(nftStorageUploader(options));
    },
  });

test.skip('it can upload one file', async (t) => {
  // Given a Context using NFT.Storage.
  const context = getContext();

  // When we upload some asset.
  const [uri] = await context.uploader.upload([
    createGenericFile('some-image', 'some-image.jpg'),
  ]);

  // Then the URI should be a valid IPFS URI.
  t.truthy(uri);
  t.true(uri.startsWith('https://nftstorage.link/ipfs/'));

  // and it should point to the uploaded asset.
  const [asset] = await context.downloader.download([uri]);
  t.is(utf8.deserialize(asset.buffer)[0], 'some-image');
});

test.skip('it can upload one file without a Gateway URL', async (t) => {
  // Given a Context using NFT.Storage without Gateway URLs.
  const context = getContext({ useGatewayUrls: false });

  // When we upload some asset.
  const [uri] = await context.uploader.upload([
    createGenericFile('some-image', 'some-image.jpg'),
  ]);

  // Then the URI should be a valid IPFS URI but not a Gateway URL.
  t.truthy(uri);
  t.true(uri.startsWith('ipfs://'));
});

test.skip('it can upload multiple files in batch', async (t) => {
  // Given a Context using NFT.Storage with a batch size of 1.
  const context = getContext({ batchSize: 1 });

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

test.skip('it can keep track of upload progress', async (t) => {
  // Given a Context using NFT.Storage.
  const context = getContext();

  // And a progress callback that counts the stored chunks.
  let chunkCounter = 0;
  const onProgress = () => {
    chunkCounter += 1;
  };

  // When we upload some asset with a size of 3 chunks.
  const MAX_CHUNK_SIZE = 10_000_000;
  await context.uploader.upload(
    [createGenericFile('x'.repeat(MAX_CHUNK_SIZE * 3), 'some-image.jpg')],
    { onProgress }
  );

  // Then the progress callback should be called 3 times.
  t.is(chunkCounter, 3);
});

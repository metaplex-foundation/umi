import {
  Context,
  createGenericFile,
  createMetaplex,
  generatedSignerIdentity,
  sol,
  utf8,
} from '@lorisleiva/js-core';
import { httpDownloader } from '@lorisleiva/js-downloader-http';
import { web3JsEddsa } from '@lorisleiva/js-eddsa-web3js';
import { fetchHttp } from '@lorisleiva/js-http-fetch';
import { web3JsRpc } from '@lorisleiva/js-rpc-web3js';
import test from 'ava';
import { bundlrUploader, BundlrUploaderOptions } from '../src';

test('example test', async (t) => {
  t.is(typeof bundlrUploader, 'function');
});

// TODO(loris): Unskip these tests when we can mock the Bundlr API.

const getContext = async (
  options?: BundlrUploaderOptions
): Promise<Context> => {
  const context = createMetaplex().use({
    install(metaplex) {
      metaplex.use(web3JsRpc('https://metaplex.devnet.rpcpool.com/'));
      metaplex.use(web3JsEddsa());
      metaplex.use(fetchHttp());
      metaplex.use(httpDownloader());
      metaplex.use(bundlrUploader(options));
      metaplex.use(generatedSignerIdentity());
    },
  });
  await context.rpc.airdrop(context.payer.publicKey, sol(1));
  return context;
};

test.skip('it can upload one file', async (t) => {
  // Given a Context using NFT.Storage.
  const context = await getContext();

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

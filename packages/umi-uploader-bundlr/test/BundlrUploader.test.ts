import {
  Context,
  createGenericFile,
  createUmi,
  generatedSignerIdentity,
  sol,
  utf8,
} from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import test from 'ava';
import { bundlrUploader, BundlrUploaderOptions } from '../src';

test('example test', async (t) => {
  t.is(typeof bundlrUploader, 'function');
});

// TODO(loris): Unskip these tests when we can mock the Bundlr API.

const getContext = async (
  options?: BundlrUploaderOptions
): Promise<Context> => {
  const context = createUmi().use({
    install(umi) {
      umi.use(web3JsRpc('https://metaplex.devnet.rpcpool.com/'));
      umi.use(web3JsEddsa());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(bundlrUploader(options));
      umi.use(generatedSignerIdentity());
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

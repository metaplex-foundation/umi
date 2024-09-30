import {
  Context,
  createGenericFile,
  createUmi,
  generatedSignerIdentity,
  sol,
} from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import test from 'ava';
import { arweaveUploader, ArweaveUploaderOptions } from '../src';
import { utf8 } from '@metaplex-foundation/umi/serializers';

test('example test', async (t) => {
  t.is(typeof arweaveUploader, 'function');
});

// TODO(loris): Unskip these tests when we can mock the Arweave API.

const getContext = async (
  options?: ArweaveUploaderOptions
): Promise<Context> => {
  const context = createUmi().use({
    install(umi) {
      umi.use(web3JsRpc('https://api.devnet.solana.com'));
      umi.use(web3JsEddsa());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(arweaveUploader(options));
      umi.use(generatedSignerIdentity());
    },
  });
  await context.rpc.airdrop(context.payer.publicKey, sol(1));
  return context;
};

test.skip('it can upload one file', async (t) => {
  t.timeout(60_000);
  const context = await getContext({
    solRpcUrl: 'https://api.devnet.solana.com',
  });

  // When we upload some asset.
  const [uri] = await context.uploader.upload([
    createGenericFile('some-image', 'some-image.jpg'),
  ]);

  // Then the URI should be a valid arweave gateway URI.
  t.truthy(uri);
  t.true(uri.startsWith('https://arweave.net/'));

  // and it should point to the uploaded asset.
  const [asset] = await context.downloader.download([uri]);
  t.is(utf8.deserialize(asset.buffer)[0], 'some-image');
});

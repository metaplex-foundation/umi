import {
  Context,
  createGenericFile,
  createUmi,
  generatedSignerIdentity,
  usd,
} from '@metaplex-foundation/umi';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import { fetchHttp } from '@metaplex-foundation/umi-http-fetch';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import test from 'ava';
import {
  ArweaveUploader,
  arweaveUploader,
  ArweaveUploaderOptions,
} from '../src';
import { utf8 } from '@metaplex-foundation/umi/serializers';

test('example test', async (t) => {
  t.is(typeof arweaveUploader, 'function');
});

// TODO(loris): Unskip these tests when we can mock the Arweave API.

const devNetRpcUrl = 'https://api.devnet.solana.com';

const getContext = async (
  options?: ArweaveUploaderOptions
): Promise<Context> => {
  const context = createUmi().use({
    install(umi) {
      umi.use(web3JsRpc(devNetRpcUrl));
      umi.use(web3JsEddsa());
      umi.use(fetchHttp());
      umi.use(httpDownloader());
      umi.use(arweaveUploader(options));
      umi.use(generatedSignerIdentity());
    },
  });

  // await context.rpc.airdrop(context.payer.publicKey, sol(1));
  return context;
};

test('can upload one file', async (t) => {
  const context = await getContext({
    solRpcUrl: devNetRpcUrl,
  });

  // When we upload some asset under the free byte limit with the devnet RPC.
  const [uri] = await context.uploader.upload([
    createGenericFile('some-image', 'some-image.jpg'),
  ]);

  // Then the URI should be a valid arweave dev gateway URI.
  t.truthy(uri);
  t.true(uri.startsWith('https://turbo.ardrive.dev/'));

  // and it should point to the uploaded asset.
  const [asset] = await context.downloader.download([uri]);
  t.is(utf8.deserialize(asset.buffer)[0], 'some-image');
});

test.skip('can upload a file above 105 KiB in size', async (t) => {
  // This test will require devnet SOL balance in the connected payer

  const context = await getContext({
    solRpcUrl: devNetRpcUrl,
  });

  const buffer = new Uint8Array(106 * 1024);
  buffer.fill(1);

  // Upload will transfer SOL from the payer's wallet to the connected uploader's wallet in exchange for Turbo Storage Credits which are used to pay for the upload
  const [uri] = await context.uploader.upload([
    createGenericFile(buffer, 'big-file.bin'),
  ]);

  t.truthy(uri);
  t.true(uri.startsWith('https://turbo.ardrive.dev/'));

  const [asset] = await context.downloader.download([uri]);
  t.deepEqual(asset.buffer, buffer);
});

test('can get a USD stripe checkout session', async (t) => {
  const context = await getContext({
    solRpcUrl: devNetRpcUrl,
  });

  const { checkoutSessionUrl, turboStorageCredits } = await (
    context.uploader as ArweaveUploader
  ).getStripeCheckoutSession(usd(10));

  t.assert(checkoutSessionUrl);
  t.true(+turboStorageCredits > 0);
});

test('can get a balance in Turbo Storage Credits', async (t) => {
  const context = await getContext({
    solRpcUrl: devNetRpcUrl,
  });

  const balance = await (
    context.uploader as ArweaveUploader
  ).getTurboStorageCreditBalance();
  t.true(+balance.valueOf() > -1);
});

test('can get a balance in SOL Equivalent', async (t) => {
  const context = await getContext({
    solRpcUrl: devNetRpcUrl,
  });

  const balance = await (context.uploader as ArweaveUploader).getBalance();
  t.true(balance.basisPoints.valueOf() > -1);
});

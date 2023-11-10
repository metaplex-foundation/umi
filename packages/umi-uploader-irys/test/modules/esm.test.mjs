/* eslint-disable import/extensions */
/* eslint-disable import/no-extraneous-dependencies */
import test from 'ava';
import { createUmi, generatedSignerIdentity } from '@metaplex-foundation/umi';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import * as exported from '../../dist/esm/index.mjs';

test('it successfully exports esm named exports', (t) => {
  const exportedKeys = Object.keys(exported);

  t.true(exportedKeys.includes('createIrysUploader'));
});

test('it can import the Irys client', async (t) => {
  const { createIrysUploader } = exported;
  const context = createUmi()
    .use(web3JsRpc('http://localhost:8899'))
    .use(web3JsEddsa())
    .use(generatedSignerIdentity());
  const irysUploader = createIrysUploader(context);
  const irys = await irysUploader.irys();
  t.true(typeof irys === 'object', 'Irys is an object');
  t.true('uploader' in irys, 'Irys can upload');
  t.true('getLoadedBalance' in irys, 'Irys can get the loaded balance');
  t.true('fund' in irys, 'Irys can fund');
  t.true('withdrawBalance' in irys, 'Irys can withdraw');
});

/* eslint-disable import/extensions */
/* eslint-disable import/no-extraneous-dependencies */
import test from 'ava';

// These tests hit live services (Turbo/Irys, devnet). They are skipped
// unless UMI_RPC_NETWORK_TESTS is set, so offline runs stay green; CI
// sets the variable and runs them.
const testWithNetwork = process.env.UMI_RPC_NETWORK_TESTS ? test : test.skip;
import {
  createBaseUmi,
  generatedSignerIdentity,
} from '@metaplex-foundation/umi';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import * as exported from '../../dist/esm/index.mjs';

test('it successfully exports esm named exports', (t) => {
  const exportedKeys = Object.keys(exported);

  t.true(exportedKeys.includes('createIrysUploader'));
});

testWithNetwork('it can import the Irys client', async (t) => {
  const { createIrysUploader } = exported;
  const context = createBaseUmi()
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

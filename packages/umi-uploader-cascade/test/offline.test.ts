import { createBaseUmi, lamports } from '@metaplex-foundation/umi';
import test from 'ava';
import { cascadeUploader, createCascadeUploader } from '../src';

/**
 * Offline behavior of the Cascade uploader. The upload paths hit the
 * hardcoded Pastel gateway and are covered by (network-gated) live
 * tests; these cover the construction guards and static behavior.
 */

test('it requires an api key', (t) => {
  const umi = createBaseUmi();
  t.throws(() => createCascadeUploader(umi), {
    message: /API key is required/,
  });
  t.throws(() => createCascadeUploader(umi, { apiKey: '' }), {
    message: /API key is required/,
  });
});

test('the plugin fails to install without an api key', (t) => {
  t.throws(() => createBaseUmi().use(cascadeUploader({ apiKey: '' })), {
    message: /API key is required/,
  });
});

test('uploads are free of protocol-level charges', async (t) => {
  const uploader = createCascadeUploader(createBaseUmi(), {
    apiKey: 'test-api-key',
  });
  t.deepEqual(await uploader.getUploadPrice([]), lamports(0));
});

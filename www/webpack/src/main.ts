import './style.css';
import { Buffer } from 'buffer';
import process from 'process';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { generateSigner, signerIdentity } from '@metaplex-foundation/umi';

// Polyfill Buffer and process globally for browser
globalThis.Buffer = Buffer;
globalThis.process = process;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Umi Irys Uploader Test (Webpack)</h1>
    <div class="card">
      <button id="test-btn" type="button">Test Irys Uploader</button>
      <div id="output" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; min-height: 100px;">
        <p>Click the button to test the Irys uploader initialization</p>
      </div>
    </div>
    <p class="read-the-docs">
      This tests that the umi-uploader-irys package can be loaded in a Webpack-bundled app
    </p>
  </div>
`;

const outputEl = document.querySelector<HTMLDivElement>('#output')!;

function log(message: string, isError = false) {
  const p = document.createElement('p');
  p.textContent = message;
  p.style.color = isError ? 'red' : 'green';
  outputEl.appendChild(p);
}

document.querySelector<HTMLButtonElement>('#test-btn')!.addEventListener('click', async () => {
  outputEl.innerHTML = '<p>Testing...</p>';

  try {
    log('✓ Imported umi-bundle-defaults');
    log('✓ Imported umi-uploader-irys');

    // Create a Umi instance with devnet
    const umi = createUmi('https://api.devnet.solana.com');
    log('✓ Created Umi instance');

    // Generate a test signer and set it as identity
    const signer = generateSigner(umi);
    umi.use(signerIdentity(signer));
    log('✓ Created test signer');

    // Install the Irys uploader plugin
    umi.use(irysUploader());
    log('✓ Installed Irys uploader plugin');

    // Check that the uploader was installed
    if (umi.uploader) {
      log('✓ Uploader interface is available on umi instance');
      log(`✓ Uploader type: ${typeof umi.uploader}`);

      // Check for irys-specific methods
      if ('irys' in umi.uploader) {
        log('✓ Irys-specific methods are available');
      }

      log('🎉 SUCCESS: All tests passed! The Irys uploader loaded correctly in Webpack.');
    } else {
      log('✗ Uploader interface not found', true);
    }

  } catch (error) {
    log(`✗ ERROR: ${error instanceof Error ? error.message : String(error)}`, true);
    console.error('Full error:', error);
  }
});

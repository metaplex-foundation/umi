# umi-uploader-arweave-via-turbo

An uploader implementation relying on Arweave. Takes advantage of the Turbo SDK and AR.IO bundling infrastructure to provide seamless upload to Arweave.

## Installation

```sh
npm install @metaplex-foundation/umi-uploader-arweave-via-turbo
```

## Usage

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { arweaveUploader } from '@metaplex-foundation/umi-uploader-arweave-via-turbo';

const umi = createUmi('https://api.mainnet-beta.solana.com').use(
  arweaveUploader()
);
```

## Configuration

`arweaveUploader(options)` accepts:

- `arweaveGatewayUrl` — base URL of the Arweave gateway used to compose the asset URIs returned from `upload()` / `uploadJson()`. Defaults to `https://turbo-gateway.com`. These URIs are typically written into on-chain NFT metadata, so if you want your assets resolved through a different gateway set it here:

  ```ts
  umi.use(arweaveUploader({ arweaveGatewayUrl: 'https://turbo-gateway.com' }));
  ```

  The same gateway is used on every cluster — Turbo does not run a separate devnet content gateway.

- `uploadServiceUrl` / `paymentServiceUrl` — Turbo upload and payment API endpoints. Default to `https://upload.ardrive.io` and `https://payment.ardrive.io` for every cluster; Turbo does not run a separate devnet environment. Override only if you have a specific reason (custom Turbo deployment, staging env, etc.).
- `solRpcUrl`, `priceMultiplier`, `payer` — see source for details.

## Pricing and free uploads

Uploads under **100KB are free**, up to **200MB per IP per day**. Larger uploads are paid in Turbo Storage Credits, purchased automatically from the payer's SOL balance (or via a Stripe checkout session for USD top-ups).

### Testing on devnet

You can use this uploader from a Solana program deployed to devnet — contracts and NFTs still live on devnet while their metadata is uploaded to Arweave through Turbo's production service. Within the free tier (under 100KB per file, up to 200MB per IP per day) nothing more is required: no SOL payment is needed, so devnet SOL is fine. For uploads above the free tier, real mainnet SOL is required to purchase Turbo Storage Credits — devnet SOL cannot pay for paid uploads, and the upload will error if you try.

# umi-uploader-cascade

A Umi uploader that stores assets **permanently** on [Lumera Cascade](https://lumera.io)
(pay once, store forever) through a hosted [cascade-api](https://api.lumera.help)
gateway. The URIs it returns work everywhere Umi's uploader interface is used —
Token Metadata, Core, Candy Machine, and Bubblegum.

## Installation

```sh
npm install @metaplex-foundation/umi-uploader-cascade
```

## Usage

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { cascadeUploader } from '@metaplex-foundation/umi-uploader-cascade';

const umi = createUmi('https://api.mainnet-beta.solana.com').use(
  cascadeUploader({ apiKey: process.env.CASCADE_API_KEY! })
);

const [imageUri] = await umi.uploader.upload([imageFile]);
const metadataUri = await umi.uploader.uploadJson({
  name: 'My NFT',
  image: imageUri,
});
```

Each URI is a stable, immutable gateway URL:
`https://api.lumera.help/download/{action_id}`. An API key is issued by the
gateway operator — see [api.lumera.help](https://api.lumera.help).

### Archive mode (large collections)

Cascade charges `base_action_fee + fee_per_kbyte × size` **per action**, so
inscribing a 10,000-item collection one file at a time pays the base fee 10,000
times. Archive mode packs every file from a single `upload()` call into one
action — one fee — while each file stays individually addressable:

```ts
umi.use(cascadeUploader({ apiKey, mode: 'archive' }));

const uris = await umi.uploader.upload(collectionImages);
// -> https://api.lumera.help/download/{action_id}/imgs/1.png, .../imgs/2.png, ...
```

`uploadJson` always inscribes metadata as its own action, regardless of mode.

### Options

| Option     | Default                   | Description                                                                                    |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `apiKey`   | — (required)              | Bearer key for the gateway's `/upload*` routes                                                 |
| `endpoint` | `https://api.lumera.help` | Any cascade-api deployment                                                                     |
| `mode`     | `'file'`                  | `'file'` = one action per file; `'archive'` = one action per `upload()` call, with per-file URLs |

### Pricing

`getUploadPrice()` returns **0 SOL** — the caller pays nothing on Solana; the
gateway's Lumera key pays the LUME fee, metered against the API key. The real
cost is exposed instead of hidden:

```ts
const ulume = await umi.uploader.getUploadPriceUlume(files); // bigint, in ulume
const quote = await umi.uploader.estimate([1024, 2048]); // per-size breakdown
```

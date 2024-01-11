# Interface implementations

The page aims to list all the available implementations of [the interfaces defined by Umi](./interfaces.md) page.

## Bundles

| Description | Maintainer | Links |
| --- | --- | --- |
| Umi's default bundle | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-bundle-defaults) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-bundle-defaults) |
| Umi's test bundle | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-bundle-tests) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-bundle-tests) |

## Signer

| Description | Maintainer | Links |
| --- | --- | --- |
| Internal Signer plugins | Metaplex | [Signers documentation](./publickeys-signers.md#signers) |
| Use Solana's Wallet Adapters | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-signer-wallet-adapters) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-signer-wallet-adapters) |
| Derive new Signers from message signatures | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-signer-derived) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-signer-derived) |

## Eddsa Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Use Solana's web3.js | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-eddsa-web3js) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-eddsa-web3js) |

## RPC Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Use Solana's web3.js | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-rpc-web3js) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-rpc-web3js) |
| An RPC decorator that chunks `getAccounts` requests into batches of a given size, and run them in parallel to abstract API limitations to the end-user. | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-rpc-chunk-get-accounts) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-rpc-chunk-get-accounts) |

## Transaction Factory Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Use Solana's web3.js | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-transaction-factory-web3js) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-transaction-factory-web3js) |

## Uploader Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Uses AWS | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-uploader-aws) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-uploader-aws) |
| Uses Irys.xyz | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-uploader-irys) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-uploader-irys) |
| Uses NFT.Storage | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-uploader-nft-storage) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-uploader-nft-storage) |
| Uses a local cache to mock uploads and downloads | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-storage-mock) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-storage-mock) |
| Uses 4EVERLAND | 4EVERLAND | [GitHub](https://github.com/4everland/umi-uploader-4everland) / [NPM](https://www.npmjs.com/package/@4everland/umi-uploader-4everland) |
| Uses Bundlr.network (Deprecated - use `umi-uploader-irys`) | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-uploader-bundlr) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-uploader-bundlr) |
## Downloader Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Uses the Http interface | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-downloader-http) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-downloader-http) |
| Uses a local cache to mock uploads and downloads | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-storage-mock) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-storage-mock) |

## Http Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Uses the fetch API via the `node-fetch` library | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-http-fetch) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-http-fetch) |

## Program Repository Interface

| Description | Maintainer | Links |
| --- | --- | --- |
| Default implementation with no extra dependencies | Metaplex | [GitHub](https://github.com/metaplex-foundation/umi/tree/main/packages/umi-program-repository) / [NPM](https://www.npmjs.com/package/@metaplex-foundation/umi-program-repository) |

<p align="center">
<strong>Next: <a href="./publickeys-signers.md">Public keys and signers ≫</a></strong>
</p>

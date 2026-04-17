---
'@metaplex-foundation/umi-uploader-arweave-via-turbo': minor
---

Add `gatewayUrl` option to `ArweaveUploaderOptions` so consumers can choose which Arweave gateway host is composed into the URIs returned from `upload()` / `uploadJson()`. Since those URIs are typically written into on-chain NFT metadata, making this configurable lets consumers point at `ar.io`, a self-hosted gateway, or any other resolver they want to commit to long-term.

**Behavior change:** the default gateway used on mainnet/non-devnet clusters has changed from `https://arweave.net` to `https://turbo-gateway.com`. Devnet default (`https://turbo.ardrive.dev/raw`) is unchanged. If you need to keep minting NFTs whose metadata URIs use the old host (e.g. for parity with previously-minted assets), pass it explicitly:

```ts
umi.use(arweaveUploader({ gatewayUrl: 'https://arweave.net' }));
```

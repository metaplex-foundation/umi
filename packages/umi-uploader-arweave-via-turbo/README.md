# umi-uploader-arweave-via-turbo

An uploader implementation relying on Arweave. Takes advantage of Turbo and AR.IO bundling infrastructure to provide seamless upload to Arweave

## Installation

```sh
npm install @metaplex-foundation/umi-uploader-arweave-via-turbo
```

## Networks

On `devnet`, `testnet` and `localnet`, the uploader uses the ar.io testnet services (`upload.services.ar-io.dev` and `payment.services.ar-io.dev`) and returns `https://ar-io.dev/raw` URIs. On `mainnet-beta` and custom RPC endpoints, it uses `upload.ardrive.io` and `payment.ardrive.io`. Pass `uploadServiceUrl` and `paymentServiceUrl` to override them.

Paying for uploads needs a signer whose `signMessage` signs raw bytes, so hardware wallets such as Ledger can make free uploads but cannot pay. To make several paid `upload()` calls with one SOL transfer, call `fund()` once beforehand.

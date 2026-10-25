---
'@metaplex-foundation/umi-uploader-arweave-via-turbo': minor
---

Replace `@ardrive/turbo-sdk` with `@ardrive/turbo-upload`, which has no dependencies. Any Umi signer can now upload, since signing goes through `signMessage`, and funding builds the SOL transfer with Umi. The free limit now applies to each file, as the upload service applies it, so only files over the limit are paid for. A free file the upload service refuses with a 402 is paid for and sent again. `getBalance` and `getUploadPriceFromBytes` no longer throw on amounts below 0.000001 SOL.

**Breaking**

- `arweave()` returns a `TurboUpload` instead of a `TurboAuthenticatedClient`.
- `createArweaveUploader` needs `transactions` in its context.
- `solRpcUrl` is ignored.
- `getStripeCheckoutSession` returns credits as winc / 10^12 and credits `options.payer` when it is set.
- `testnet` and `localnet` use the ar.io testnet services, like `devnet`.

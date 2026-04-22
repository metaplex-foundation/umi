---
'@metaplex-foundation/umi-uploader-arweave-via-turbo': minor
---

Add `arweaveGatewayUrl` option to `ArweaveUploaderOptions` so consumers can control the Arweave gateway host composed into the URIs returned from `upload()` / `uploadJson()`. Those URIs are typically written into on-chain NFT metadata, so making the gateway configurable lets consumers commit to a resolver they intend to rely on long-term.

The option is named `arweaveGatewayUrl` — not `gatewayUrl` — to avoid confusion with the Turbo SDK's own `gatewayUrl` field, which in Turbo's vocabulary means the Solana RPC endpoint (exposed here as `solRpcUrl`).

**Default gateway changed:**

- **Mainnet / non-devnet:** `https://arweave.net` → `https://turbo-gateway.com`
- **Devnet:** `https://turbo.ardrive.dev/raw` → `https://turbo-gateway.com` (the previous devnet gateway is no longer operational, and Turbo does not run a separate devnet content gateway — one gateway serves every cluster)

**Turbo upload and payment endpoints consolidated.** Turbo has no separate devnet environment, so `uploadServiceUrl` and `paymentServiceUrl` now default to `https://upload.ardrive.io` and `https://payment.ardrive.io` on every cluster (previously the devnet cluster defaulted to `upload.ardrive.dev` / `payment.ardrive.dev`). Developers can still point Solana contracts at devnet while uploading through Turbo's production service — the free tier (uploads under 100KB, up to 200MB per IP per day) requires no SOL payment, so devnet wallets are fine for testing. Paid uploads above the free tier need real mainnet SOL; attempting a paid upload with devnet SOL will now error explicitly rather than silently producing an unresolvable URI. The old staging endpoints can still be opted into via the `uploadServiceUrl` / `paymentServiceUrl` options if needed.

Callers who need URI parity with previously-minted NFTs can restore the old main-chain gateway behavior by passing `arweaveGatewayUrl` explicitly:

```ts
umi.use(arweaveUploader({ arweaveGatewayUrl: 'https://arweave.net' }));
```

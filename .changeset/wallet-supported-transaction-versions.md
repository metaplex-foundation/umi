---
'@metaplex-foundation/umi-signer-wallet-adapters': minor
---

Add `getLatestSupportedTransactionVersion(wallet)` and `getSupportedTransactionVersions(wallet)` to read which transaction versions the connected wallet can sign. They accept a wallet adapter or the `useWallet()` state from `@solana/wallet-adapter-react`. For wallet-standard wallets they read the `solana:signTransaction` feature, the one Umi signs through, and fall back to the adapter's `supportedTransactionVersions` otherwise. Wallets that advertise no versions are treated as legacy-only.

Call it before building a transaction and build for the returned version: V1 sets the compute budget with `setTransactionConfig()` and cannot use address lookup tables, whereas legacy and V0 use ComputeBudget instructions.

```ts
const version = getLatestSupportedTransactionVersion(useWallet());
const builder =
  version === 1
    ? transactionBuilder()
        .add(ix)
        .useV1()
        .setTransactionConfig({
          computeUnitLimit: 600_000,
          priorityFee: lamports(600),
        })
    : transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 600_000 }))
        .add(setComputeUnitPrice(umi, { microLamports: 1_000 }))
        .add(ix)
        .setVersion(version);
```

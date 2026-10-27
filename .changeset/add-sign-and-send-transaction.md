---
"@metaplex-foundation/umi": minor
"@metaplex-foundation/umi-signer-wallet-adapters": minor
---

Add an optional `signAndSendTransaction` method to the `Signer` interface, for signers that can sign and submit a transaction in a single step (e.g. a connected wallet, avoiding a second wallet prompt). `createNoopSigner` leaves it unimplemented; `createNullSigner` throws the same informative error as its other methods.

Implement it in `createSignerFromWalletAdapter` via the wallet's `sendTransaction` method (the long-standing Wallet Adapter capability), given a `Connection` to submit through. Both `createSignerFromWalletAdapter` and the `walletAdapterIdentity`/`walletAdapterPayer` plugins now accept an optional `connection` argument; everything else is unaffected when it's omitted.

This is purely additive - every existing `Signer` still satisfies the interface unchanged.

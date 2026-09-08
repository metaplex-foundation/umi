---
"@metaplex-foundation/umi": minor
"@metaplex-foundation/umi-rpc-web3js": minor
---

Add `onAccountChange` to `RpcInterface` and implement it in `umi-rpc-web3js`. Account change subscriptions can now be made via `umi.rpc.onAccountChange(publicKey, callback, options)` without reaching into the underlying web3.js connection. The callback receives the updated account as a Umi `MaybeRpcAccount` together with the slot context, so a closed account arrives with `exists: false`, and the returned function removes the subscription.

---
'@metaplex-foundation/umi': minor
'@metaplex-foundation/umi-transaction-factory-web3js': minor
'@metaplex-foundation/umi-web3js-adapters': minor
'@metaplex-foundation/umi-rpc-web3js': minor
'@metaplex-foundation/umi-signer-wallet-adapters': patch
---

Add support for Solana V1 transactions (SIMD-0385). `transactionBuilder().useV1()` builds transactions of up to 4096 bytes. Their compute budget lives in the message as a `TransactionConfig`: `priorityFee`, `computeUnitLimit`, `loadedAccountsDataSizeLimit` and `heapSize`. `setTransactionConfig(config)` merges into the config already set and ignores `undefined` fields; `useV1(config)` does both at once. `useV1()` is a drop-in for existing builders: ComputeBudget program instructions, which V1 transactions ignore, are folded into the config and removed from the message, with the compute unit price times the final compute unit limit becoming the priority fee. Limits left unset default to what the runtime grants non-builtin instructions of legacy and V0 transactions: 200k compute units per instruction capped at 1.4M, and 64MiB of loaded account data. `setEstimatedTransactionConfig(umi)` simulates the transaction with `TRANSACTION_CONFIG_MAX` and sets the tight limits it reports, through the new pure `estimateTransactionConfig(simulation)`. `minimumTransactionsRequired`, `fitsInOneTransaction` and `unsafeSplitByTransactionSize` count the V1 protocol limits (64 accounts, 64 instructions, 12 signatures) on top of the size limit given by `getTransactionSizeLimit(version)`, and measure V1 transactions with every config field present. `TransactionInputV1` requires both limits at the type level (`TransactionConfigInput`); `assertValidTransactionConfigInput` enforces them and the heap size rule when a V1 input is compiled. Every `TransactionInput` member declares the fields of the other versions as `never`: a `transactionConfig` on a legacy or V0 input, or `addressLookupTables` on a legacy or V1 input, no longer compile, while narrowing on `version` keeps every field readable. Options that do not apply to the chosen version are ignored at build time. The web3.js transaction factory serializes, deserializes, signs and sends V1 transactions with Umi's own codec, and compiles every version through the new `compileTransactionMessage` adapter. `umi.rpc.getTransaction` and `umi.rpc.simulateTransaction` work with V1 transactions on any `@solana/web3.js` 1.x by fetching and simulating raw bytes through `umi.rpc.call`; `simulateTransaction` also types `loadedAccountsDataSize` and forwards `commitment` and `minContextSlot`.

Behavior changes for every transaction version:

- `umi.rpc.call` rejects with the new `RpcError` (a `UmiError` with source `'rpc'` carrying the node's `code`, `data` and, when present, `logs`) instead of resolving `undefined` on JSON-RPC errors.
- `umi.rpc.call` merges `commitment` and `extra` into a trailing config object instead of appending a third parameter that nodes reject.
- `umi.rpc.getTransaction` and `umi.rpc.simulateTransaction` reject with that `RpcError` and the raw node message instead of web3.js's `SolanaJSONRPCError` and `failed to simulate transaction: ...` errors.
- `umi.rpc.simulateTransaction` resolves program errors through `context.programs.resolveError` when the node returns logs, as `sendTransaction` does.
- `umi.rpc.simulateTransaction` returns `replacementBlockhash.lastValidBlockHeight` as the declared `bigint` rather than a number.
- `umi.rpc.simulateTransaction` requires `context.transactions`, as `sendTransaction` and `getTransaction` already did.
- `umi.transactions.create` throws an `SdkError` instead of a web3.js assertion for a `signatures` array of the wrong length.

Limitation: `@solana/web3.js` 1.x cannot represent V1 messages, so `toWeb3JsMessage`, `toWeb3JsMessageFromInput`, `toWeb3JsTransaction` and `toWeb3JsLegacyTransaction` throw a `Web3JsTransactionVersionError` for them, and the wallet-adapter signer throws it before contacting the wallet: sign V1 transactions with a wallet stack that supports them, or build them with `useV0()`.

---
'@metaplex-foundation/umi': minor
'@metaplex-foundation/umi-web3js-adapters': minor
'@metaplex-foundation/umi-transaction-factory-web3js': minor
'@metaplex-foundation/umi-rpc-web3js': minor
'@metaplex-foundation/umi-eddsa-web3js': minor
'@metaplex-foundation/umi-signer-wallet-adapters': minor
'@metaplex-foundation/umi-serializer-beet': minor
'@metaplex-foundation/umi-uploader-irys': minor
'@metaplex-foundation/umi-uploader-arweave-via-turbo': minor
'@metaplex-foundation/umi-bundle-defaults': minor
'@metaplex-foundation/umi-bundle-tests': minor
---

Add support for V1 transactions (SIMD-0385): transactions of up to 4096 bytes whose compute budget lives in the message instead of ComputeBudget instructions, and which do not support address lookup tables.

- **Requires `@solana/web3.js` `^1.99.0`**, the first stable release that understands V1 transactions. The peer dependency of every web3.js-based package is raised accordingly; upgrade web3.js within the 1.x line before upgrading.
- `TransactionVersion` now includes `1` (code that switches over it exhaustively needs a new case), `TransactionMessage` gains an optional `transactionConfig`, and the new `TransactionInputV1` lets `umi.transactions.create` build V1 transactions. `TransactionInputV0.version` is now required, so every `create()` input names its version explicitly (`version: 0` where it was omitted); defaults live in `TransactionBuilder`.
- `TransactionBuilder` gains `useV1()` and `setTransactionConfig()`, uses the 4096-byte `TRANSACTION_V1_SIZE_LIMIT` when splitting V1 transactions, and defaults the compute unit limit and loaded accounts data size limit, which the runtime treats as zero when unset, to what legacy and V0 transactions get.
- `TransactionBuilder` resolves its version like its fee payer: an explicit `setVersion()` wins, otherwise the transaction factory's new `getDefaultVersion()` decides, and `getVersion(context)` returns the result. The web3.js factory defaults to V0; opt every builder into V1 with `web3JsTransactionFactory({ defaultTransactionVersion: 1 })` or `createUmi(endpoint, { defaultTransactionVersion: 1 })`. `umi.transactions.create()` still requires an explicit version, and custom `TransactionFactoryInterface` implementations must add `getDefaultVersion()`.
- The core package now owns the transaction wire format: `getTransactionMessageSerializer` and `getTransactionSerializer` handle every version, reading the version from the first byte when deserializing, and `getTransactionV1MessageSerializer` and `getTransactionV1Serializer` cover V1 specifically, since `@solana/web3.js` can only deserialize V1. The web3.js transaction factory compiles accounts and delegates serialization to them.
- The web3.js adapters convert V1 messages and return `SerializableMessageV1` and `SerializableVersionedTransaction` instances that `@solana/web3.js` consumers, such as wallet adapters, can serialize.
- Signing a V1 transaction through `umi-signer-wallet-adapters` requires a wallet that supports V1, which stock `@solana/web3.js` 1.x cannot do. Umi hands the adapter serializable V1 bytes and does not check the wallet's supported versions.
- The web3.js RPC requests `maxSupportedTransactionVersion: 1` when fetching transactions.
- `TransactionBuilder.build()` now throws for a V1 transaction that contains ComputeBudget program instructions, which V1 transactions ignore, or that has address lookup tables, which V1 transactions do not support, and for a legacy or V0 transaction that has a transaction config, which only V1 transactions carry. Set the compute budget with `setTransactionConfig()` on V1 and with ComputeBudget instructions otherwise.
- `TransactionV1Config` values are validated when a V1 message is serialized (`assertValidTransactionV1Config`): the compute unit limit must be an integer between 0 and 1,400,000 and the heap size a multiple of 1,024 between 32,768 and 262,144, so invalid values fail with a clear error instead of being silently clamped or rejected by the node with an unrelated message.
- Converting a V1 message to `@solana/web3.js` objects (`toWeb3JsMessage`, `toWeb3JsMessageFromInput`) throws for a priority fee above `Number.MAX_SAFE_INTEGER` (2^53 - 1) lamports, which `@solana/web3.js` models as a number and cannot represent; `umi.transactions.create` keeps such fees exact.

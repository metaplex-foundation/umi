---
'@metaplex-foundation/umi': major
'@metaplex-foundation/umi-web3js-adapters': major
'@metaplex-foundation/umi-transaction-factory-web3js': major
'@metaplex-foundation/umi-rpc-web3js': major
'@metaplex-foundation/umi-eddsa-web3js': major
'@metaplex-foundation/umi-signer-wallet-adapters': major
'@metaplex-foundation/umi-serializer-beet': major
'@metaplex-foundation/umi-uploader-irys': major
'@metaplex-foundation/umi-uploader-arweave-via-turbo': major
'@metaplex-foundation/umi-bundle-defaults': major
'@metaplex-foundation/umi-bundle-tests': major
---

Add support for V1 transactions (SIMD-0385): transactions of up to 4096 bytes whose compute budget lives in the message instead of ComputeBudget instructions, and which do not support address lookup tables.

- **Breaking:** the `@solana/web3.js` peer dependency now requires `1.99.0` or above, the first stable release that understands V1 transactions.
- `TransactionVersion` now includes `1` (a breaking change for code that switches over it exhaustively), `TransactionMessage` gains an optional `transactionConfig`, and the new `TransactionInputV1` lets `umi.transactions.create` build V1 transactions.
- `TransactionBuilder` gains `useV1()` and `setTransactionConfig()`, uses the 4096-byte `TRANSACTION_V1_SIZE_LIMIT` when splitting V1 transactions, and defaults the compute unit limit and loaded accounts data size limit, which the runtime treats as zero when unset, to what legacy and V0 transactions get.
- The core package serializes and deserializes V1 messages and transactions itself via `getTransactionV1MessageSerializer` and `getTransactionV1Serializer`, since `@solana/web3.js` can only deserialize them.
- The web3.js adapters convert V1 messages and return `SerializableMessageV1` and `SerializableVersionedTransaction` instances that `@solana/web3.js` consumers, such as wallet adapters, can serialize.
- The web3.js RPC requests `maxSupportedTransactionVersion: 1` when fetching transactions.
- `TransactionBuilder.build()` now throws for a V1 transaction that contains ComputeBudget program instructions, which V1 transactions ignore, or that has address lookup tables, which V1 transactions do not support. Set the compute budget with `setTransactionConfig()` instead.
- `TransactionConfig` values are validated when a V1 message is serialized (`assertValidTransactionConfig`): the compute unit limit must be an integer between 0 and 1,400,000 and the heap size a multiple of 1,024 between 32,768 and 262,144, so invalid values fail with a clear error instead of being silently clamped or rejected by the node with an unrelated message.

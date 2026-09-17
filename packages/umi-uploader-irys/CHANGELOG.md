# @metaplex-foundation/umi-uploader-irys

## 1.6.0

### Minor Changes

- [#216](https://github.com/metaplex-foundation/umi/pull/216) [`19dbf19`](https://github.com/metaplex-foundation/umi/commit/19dbf199e600e02307ea00653860a9e5bd7c692e) Thanks [@brandontulsi](https://github.com/brandontulsi)! - Add support for V1 transactions (SIMD-0385): transactions of up to 4096 bytes whose compute budget lives in the message instead of ComputeBudget instructions, and which do not support address lookup tables.

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

### Patch Changes

- [#164](https://github.com/metaplex-foundation/umi/pull/164) [`5790f21`](https://github.com/metaplex-foundation/umi/commit/5790f219a797e9667ce15065d8851ce9c023bc38) Thanks [@tonyboylehub](https://github.com/tonyboylehub)! - Updated PromisePool import method for umi-uploader-irys which would error out on default import. Changing to a named import as per the docs seems to fix this issue.

- Updated dependencies [[`b51f80e`](https://github.com/metaplex-foundation/umi/commit/b51f80e57e9a83a98fe1be2bc322f610e9ad12ec), [`19dbf19`](https://github.com/metaplex-foundation/umi/commit/19dbf199e600e02307ea00653860a9e5bd7c692e)]:
  - @metaplex-foundation/umi@1.6.0
  - @metaplex-foundation/umi-web3js-adapters@1.6.0

## 1.0.0

### Major Changes

- [`d50553a`](https://github.com/metaplex-foundation/umi/commit/d50553a419b7c9beac996a7c0b4d5942c91b5b4e) Thanks [@blockiosaurus](https://github.com/blockiosaurus)! - Release 1.0

### Minor Changes

- [#156](https://github.com/metaplex-foundation/umi/pull/156) [`c33df61`](https://github.com/metaplex-foundation/umi/commit/c33df615681f56f502c496c59d7ab418dff24c9a) Thanks [@JesseTheRobot](https://github.com/JesseTheRobot)! - Update uploader-irys to use the latest packages

### Patch Changes

- [#145](https://github.com/metaplex-foundation/umi/pull/145) [`48bb4fd`](https://github.com/metaplex-foundation/umi/commit/48bb4fdb92cb4e131e301628796df4b6af982b89) Thanks [@blockiosaurus](https://github.com/blockiosaurus)! - Updating irys to latest

- [#148](https://github.com/metaplex-foundation/umi/pull/148) [`597fcad`](https://github.com/metaplex-foundation/umi/commit/597fcad8a309f770fdd302f3771cc934345f788a) Thanks [@rocketfren](https://github.com/rocketfren)! - Update upload to return Irys gateway URLs to Arweave instead of the arweave.net Gateway. This fixes current devnet issues.

- Updated dependencies [[`48bb4fd`](https://github.com/metaplex-foundation/umi/commit/48bb4fdb92cb4e131e301628796df4b6af982b89), [`7404903`](https://github.com/metaplex-foundation/umi/commit/7404903e58fe519c7d79b7c0be5389cb16398fb7), [`e192236`](https://github.com/metaplex-foundation/umi/commit/e1922366470201bb51639a3a2660fee3a4cc7f17), [`d50553a`](https://github.com/metaplex-foundation/umi/commit/d50553a419b7c9beac996a7c0b4d5942c91b5b4e), [`91a4d75`](https://github.com/metaplex-foundation/umi/commit/91a4d75484ce6d65e30e29646539c18d88ee1f80), [`8c8aa5f`](https://github.com/metaplex-foundation/umi/commit/8c8aa5f4f2dc22872870cb4824c3672d6f8ac0ca)]:
  - @metaplex-foundation/umi@1.0.0
  - @metaplex-foundation/umi-web3js-adapters@1.0.0

## 0.9.2

### Patch Changes

- Updated dependencies [[`6276f96`](https://github.com/metaplex-foundation/umi/commit/6276f9651f91b973b474cb63a0457917b09ed292)]:
  - @metaplex-foundation/umi@0.9.2
  - @metaplex-foundation/umi-web3js-adapters@0.9.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`c450559`](https://github.com/metaplex-foundation/umi/commit/c4505599778ca53695b9762f523fd39f813a0ec9), [`7c03bd1`](https://github.com/metaplex-foundation/umi/commit/7c03bd1841e14f9352d0c166e5d5e305a543c77a)]:
  - @metaplex-foundation/umi@0.9.1
  - @metaplex-foundation/umi-web3js-adapters@0.9.1

## 0.9.0

### Patch Changes

- Updated dependencies [[`703bace`](https://github.com/metaplex-foundation/umi/commit/703baceb19155a53923eb63b99fdb08e7bf7cce8)]:
  - @metaplex-foundation/umi@0.9.0
  - @metaplex-foundation/umi-web3js-adapters@0.9.0

## 0.8.11

### Patch Changes

- [#91](https://github.com/metaplex-foundation/umi/pull/91) [`44d33c5`](https://github.com/metaplex-foundation/umi/commit/44d33c56c1bdcf348d37bb838c1d5f6e1dfc4095) Thanks [@JesseTheRobot](https://github.com/JesseTheRobot)! - Add new Irys uploader to replace the deprecated Bundlr uploader

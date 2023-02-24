# @metaplex-foundation/umi-core

## 0.3.2

### Patch Changes

- [`66a7d91`](https://github.com/metaplex-foundation/umi/commit/66a7d919146ee348739438f7b0e33cc746d5d1ba) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Fix setBlockhash call

## 0.3.1

### Patch Changes

- [`e566c1b`](https://github.com/metaplex-foundation/umi/commit/e566c1ba7232e1020234a750ec83607d50f60c56) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Add unique helpers for PublicKeys and Signers

- [#13](https://github.com/metaplex-foundation/umi/pull/13) [`acdc77a`](https://github.com/metaplex-foundation/umi/commit/acdc77af0f6c6e231b42b22e116497908043c57c) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Refactor TransactionBuilder to support Transaction sizes and LUTs

## 0.3.0

### Minor Changes

- [#10](https://github.com/metaplex-foundation/umi/pull/10) [`95d56e9`](https://github.com/metaplex-foundation/umi/commit/95d56e969b3da53e7b60758db4c530d206765697) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Update Serializer interface

## 0.2.3

### Patch Changes

- [`697bddd`](https://github.com/metaplex-foundation/umi/commit/697bddd6cdd520bd1f9190eb9827c3f351512145) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Add getSlot to RPC Interface

## 0.2.2

### Patch Changes

- [`e1c9595`](https://github.com/metaplex-foundation/umi/commit/e1c9595dd7f0aeb4469e86a496bc25bbb43a1b5d) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Rename MetaplexError to UmiError

## 0.2.1

### Patch Changes

- [#6](https://github.com/metaplex-foundation/umi/pull/6) [`d28f4dc`](https://github.com/metaplex-foundation/umi/commit/d28f4dc05c45f35a429fa818e060aed648778718) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Add support for variable string serializers

  There are now three ways to serialize/deserialize a string:

  ```ts
  // With prefix.
  umi.serializer.string().serialize('A');
  // -> 0x0100000041

  // Fixed.
  umi.serializer.fixedString(8).serialize('A');
  // -> 0x4100000000000000

  // Variable.
  umi.serializer.variableString().serialize('A');
  // -> 0x41
  ```

## 0.2.0

### Minor Changes

- [`b4d681f`](https://github.com/metaplex-foundation/umi/commit/b4d681fd173fb5cc6fe7907c610a23703695c4f6) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Rename Metaplex to Umi

## 0.1.2

### Patch Changes

- [`d3ee23a`](https://github.com/metaplex-foundation/umi/commit/d3ee23aa7ee19a4c6db0e3556e58ee4d12b8ab2b) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Ensure all packages are built before trying to publish

## 0.1.1

### Patch Changes

- [`f30119d`](https://github.com/metaplex-foundation/umi/commit/f30119daf5c51d893c654a064f5fabeb9246aa41) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Publish a new version with changelog and a release tag

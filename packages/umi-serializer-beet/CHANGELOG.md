# @metaplex-foundation/umi-serializer-beet

## 0.2.2

### Patch Changes

- [`e1c9595`](https://github.com/metaplex-foundation/umi/commit/e1c9595dd7f0aeb4469e86a496bc25bbb43a1b5d) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Rename MetaplexError to UmiError

- Updated dependencies [[`e1c9595`](https://github.com/metaplex-foundation/umi/commit/e1c9595dd7f0aeb4469e86a496bc25bbb43a1b5d)]:
  - @metaplex-foundation/umi-core@0.2.2

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

- Updated dependencies [[`d28f4dc`](https://github.com/metaplex-foundation/umi/commit/d28f4dc05c45f35a429fa818e060aed648778718)]:
  - @metaplex-foundation/umi-core@0.2.1

## 0.2.0

### Minor Changes

- [`b4d681f`](https://github.com/metaplex-foundation/umi/commit/b4d681fd173fb5cc6fe7907c610a23703695c4f6) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Rename Metaplex to Umi

### Patch Changes

- Updated dependencies [[`b4d681f`](https://github.com/metaplex-foundation/umi/commit/b4d681fd173fb5cc6fe7907c610a23703695c4f6)]:
  - @metaplex-foundation/umi-core@0.2.0

## 0.1.2

### Patch Changes

- [`d3ee23a`](https://github.com/metaplex-foundation/umi/commit/d3ee23aa7ee19a4c6db0e3556e58ee4d12b8ab2b) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Ensure all packages are built before trying to publish

- Updated dependencies [[`d3ee23a`](https://github.com/metaplex-foundation/umi/commit/d3ee23aa7ee19a4c6db0e3556e58ee4d12b8ab2b)]:
  - @metaplex-foundation/umi-core@0.1.2

## 0.1.1

### Patch Changes

- [`f30119d`](https://github.com/metaplex-foundation/umi/commit/f30119daf5c51d893c654a064f5fabeb9246aa41) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Publish a new version with changelog and a release tag

- Updated dependencies [[`f30119d`](https://github.com/metaplex-foundation/umi/commit/f30119daf5c51d893c654a064f5fabeb9246aa41)]:
  - @metaplex-foundation/umi-core@0.1.1

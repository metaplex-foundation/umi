# @metaplex-foundation/umi-options

## 1.0.0

### Major Changes

- [`d50553a`](https://github.com/metaplex-foundation/umi/commit/d50553a419b7c9beac996a7c0b4d5942c91b5b4e) Thanks [@blockiosaurus](https://github.com/blockiosaurus)! - Release 1.0

### Minor Changes

- [#153](https://github.com/metaplex-foundation/umi/pull/153) [`f9033fa`](https://github.com/metaplex-foundation/umi/commit/f9033faf62b896b8b85d31138ce1b832200846ea) Thanks [@tonyboylehub](https://github.com/tonyboylehub)! - `wrapNullable` didn't account for an undefined input and would result in a return value of `some(undefined)` causing `isNone` checks to not pass if `undefined` was the `nullable` value.

  ```ts
  export const wrapNullable = <T>(nullable: Nullable<T>): Option<T> =>
    nullable !== null ? some(nullable) : none<T>();
  ```

  Added a `wrapNullish` function to check for both `null` and undefined which will return the value of `none()` if `null` or `undefined` is the presented `nullish` value.

  ```ts
  export const wrapNullish = <T>(nullish: Nullish<T>): Option<T> =>
    nullish !== null && nullish !== undefined ? some(nullish) : none<T>();
  ```

  - `Nullish` type added.
  - `wrapNullish` function added.
  - Tests for `wrapNullish` added.

## 0.8.9

### Patch Changes

- [#86](https://github.com/metaplex-foundation/umi/pull/86) [`05e4f9f`](https://github.com/metaplex-foundation/umi/commit/05e4f9ffa4e73d9db8442b26cd32577dc32075c2) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Add types file to package.json exports

## 0.8.8

### Patch Changes

- [#84](https://github.com/metaplex-foundation/umi/pull/84) [`05a4bdd`](https://github.com/metaplex-foundation/umi/commit/05a4bdd7da2c239ea9740e8ed7e496d3494709d9) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Skip Uint8Arrays on unwrapOptionRecursively

## 0.8.5

### Patch Changes

- [`281b12f`](https://github.com/metaplex-foundation/umi/commit/281b12f052ed343c1d5ed25335a3efe283f7809f) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Make UnwrappedOption work with opaque types

- [`f12af8e`](https://github.com/metaplex-foundation/umi/commit/f12af8e0127bea479155e73c6d4730ee94736ac7) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Export `UnwrappedOption` type

## 0.8.2

### Patch Changes

- [#68](https://github.com/metaplex-foundation/umi/pull/68) [`4accd34`](https://github.com/metaplex-foundation/umi/commit/4accd34f0a70d360321c42f395a2ad45cbadca16) Thanks [@lorisleiva](https://github.com/lorisleiva)! - Extract serializer modules and use in core umi library

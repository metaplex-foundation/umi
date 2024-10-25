---
'@metaplex-foundation/umi-options': minor
---

`wrapNullable` didn't account for an undefined input and would result in a return value of `some(undefined)` causing `isNone` checks to not pass if `undefined` was the `nullable` value.

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

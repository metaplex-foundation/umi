---
'@metaplex-foundation/umi-public-keys': major
'@metaplex-foundation/umi': major
---

Make Umi's `PublicKey` type mutually assignable with Kit's `Address` type.

`PublicKey<TAddress>` is now branded with the same structural nominal-type
markers that `@solana/kit` (3.x and above) uses for its `Address` type,
instead of Umi's own `unique symbol` brand. Because Kit's markers are
structural (mapped template-literal keys, not unique symbols), the brand is
declared locally and this package remains dependency-free — no `@solana/*`
runtime or peer dependency is added — while a Umi `PublicKey` can now be
passed directly to Kit and Codama-generated APIs and a Kit `Address` can be
used anywhere Umi expects a `PublicKey`, with no casts or conversion
functions. Compatibility is enforced at build time by type-level tests
against `@solana/addresses`.

This is a type-level breaking change only; runtime values are unchanged
(base58 strings). Code that referenced the removed phantom `__publicKey`
brand property, or that relied on `PublicKey` being *incompatible* with
Kit's `Address`, must be updated. Interop targets Kit 3.x+; Kit 2.x uses a
`unique symbol` brand and still requires explicit conversion.

---
'@metaplex-foundation/umi': minor
---

Transaction parser fixes and completeness improvements:

- Fix `parseTransaction` for v0 transactions that use address lookup tables. The previous implementation derived `numStaticAccounts` by subtracting LUT counts from `message.accounts.length`, but `message.accounts` only ever contains static account keys, so the math was wrong: static readonly accounts were reported as writable, LUT-resolved indices returned `pubkey: undefined`, and LUT writability flags were inverted. `resolveAccountMeta` now treats `message.accounts.length` as the static count directly.
- `parseTransaction` now accepts `TransactionWithMeta` and an optional `loadedAddresses` option. When LUT-resolved accounts are referenced, the parser pulls pubkeys from `meta.loadedAddresses` (if present) or `options.loadedAddresses`, and throws a clear error if neither is supplied. `meta.innerInstructions` are also decompiled and parsed as `ParsedInstruction[]`.
- `ParsedTransaction` now exposes the message header, the full static account list, the resolved `loadedAddresses`, the post-execution `meta`, and parsed `innerInstructions`.
- `ParsedInstruction` gained a `status` field (`'parsed' | 'unknown-program' | 'no-descriptors' | 'no-discriminator-match' | 'deserialize-failed'`), a `rawData: Uint8Array` always populated alongside the parsed `data`, and a `remainingBytes: Uint8Array` surfacing any bytes the data serializer did not consume.
- `parseInstruction` now matches descriptors longest-discriminator-first, so a short prefix (e.g. SPL Token `[3]`) registered before a longer one (e.g. an Anchor 8-byte) no longer shadows it.
- `parseInstruction` and `parseTransaction` accept an optional `clusterFilter`, defaulting to `'*'` so the parser is decoupled from the umi instance's current cluster.

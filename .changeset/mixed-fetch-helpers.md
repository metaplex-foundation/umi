---
"@metaplex-foundation/umi": minor
---

Add `fetchAllMixedAccounts` and `safeFetchAllMixedAccounts` helpers that fetch multiple accounts of potentially different types (possibly from different programs) in a single RPC call and deserialize each one with its own deserializer. The result tuple preserves per-account types through TypeScript inference, e.g. `[Metadata, Edition]` rather than a union.

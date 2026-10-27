---
'@metaplex-foundation/umi-uploader-cascade': minor
---

Repoint the Cascade uploader to the Lumera gateway (`https://api.lumera.help`); the previous Pastel gateway (`gateway-api.pastel.network`) is offline, which left this package non-functional. Uploads now go through cascade-api and return stable `{endpoint}/download/{action_id}` URIs.

- Propagate upload/download errors instead of swallowing them and returning `[]`, and remove a stray `console.log`.
- Add an `endpoint` option (defaults to the hosted gateway) and an `archive` mode that packs a whole `upload()` call into a single Cascade action — one fee, with per-file URLs — for large collections.
- Expose the real cost via `estimate` and `getUploadPriceUlume`; `getUploadPrice` still returns 0 SOL because the fee is paid in LUME by the gateway, not by the Solana caller.

Note: this drops the Pastel-specific `upload2` method and the `CascadeUploadResponse` / `CascadeUploadedItem` types, which described the retired gateway's response shape.

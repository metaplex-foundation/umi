---
'@metaplex-foundation/umi': patch
'@metaplex-foundation/umi-bundle-defaults': patch
'@metaplex-foundation/umi-bundle-tests': patch
'@metaplex-foundation/umi-eddsa-web3js': patch
'@metaplex-foundation/umi-public-keys': patch
'@metaplex-foundation/umi-rpc-web3js': patch
'@metaplex-foundation/umi-serializers': patch
'@metaplex-foundation/umi-serializers-encodings': patch
'@metaplex-foundation/umi-serializers-numbers': patch
'@metaplex-foundation/umi-signer-wallet-adapters': patch
'@metaplex-foundation/umi-transaction-factory-web3js': patch
'@metaplex-foundation/umi-uploader-arweave-via-turbo': patch
'@metaplex-foundation/umi-uploader-irys': patch
---

Pin internal dependencies between Umi packages to the patch range (`~`) instead of the
caret range (`^`).

All packages in this repository are version-linked, so siblings always share a release
version and a caret range never enabled a useful dedupe. What it did allow was an older
bundle resolving *newer* sibling packages while the consumer held `@metaplex-foundation/umi`
— a peer dependency — at an older version. A sibling that used a core export added in that
newer version then failed to link, surfacing as a missing-export `SyntaxError` at import time.

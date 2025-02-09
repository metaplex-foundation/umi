---
'@metaplex-foundation/umi-uploader-irys': patch
---

Updated PromisePool import method for umi-uploader-irys which would error out on default import. Changing to a named import as per the docs seems to fix this issue.

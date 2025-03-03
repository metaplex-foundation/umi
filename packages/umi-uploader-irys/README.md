# umi-uploader-irys

An uploader implementation relying on Irys.

## Installation

```sh
npm install @metaplex-foundation/umi-uploader-irys
```

## Fixes
`Module not found: Can't resolve 'fs'`  
This is due to the node plugin being imported, instead of the correct web plugin, try:  
```diff
- import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
+ import { irysUploader } from "@metaplex-foundation/umi-uploader-irys/web"
```

`Expected signer to key a keypair`  
This is due to importing the browser plugin instead of the node plugin, try:
```diff
- import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
+ import { irysUploader } from "@metaplex-foundation/umi-uploader-irys/node"
```

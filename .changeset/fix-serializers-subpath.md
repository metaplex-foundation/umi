---
"@metaplex-foundation/umi": patch
---

Add filesystem fallbacks (`serializers.js` / `serializers.mjs`) and a `default` export condition so `@metaplex-foundation/umi/serializers` resolves in environments that do not honor package.json `exports` (older Jest, Metro/React Native without package-exports enabled). Also export `./package.json` for tooling that needs it.

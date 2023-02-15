---
'@metaplex-foundation/umi-core': patch
'@metaplex-foundation/umi-serializer-beet': patch
---

Add support for variable string serializers

There is now three ways to serialize/deserialize a string:

```ts
// With prefix.
umi.serializer.string().serialize('A');
// -> 0x0100000041

// Fixed.
umi.serializer.fixedString(8).serialize('A');
// -> 0x4100000000000000

// Variable.
umi.serializer.variableString().serialize('A');
// -> 0x41
```

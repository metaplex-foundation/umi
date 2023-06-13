---
'@metaplex-foundation/umi': minor
---

Define PublicKeys as base58 strings

See (PR #62)[https://github.com/metaplex-foundation/umi/pull/62].

The `PublicKey` type is now a `string` instead of a `{ bytes: Uint8Array }`. This was done to:

- make the end-user API simpler.
- make public keys "pure" values that can easily be shared and logged.
- make Umi's API closer to the new web3.js library (See [the `@solana/keys` package](https://github.com/solana-labs/solana-web3.js/blob/6524b01189cd4917da62fe78a33fef58bd692986/packages/keys/src/base58.ts)).

If you are already using the `publicKey` helper to create public keys, your code should continue working as-is. Otherwise, you will need to pass in the base58 representation of your public keys instead of the previous object representation.

```ts
// Before.
const pubkeyA = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9');
const bytesOfPubkeyB = new Uint8Array(Array(32).fill(0));
const pubkeyB = { bytes: bytesOfPubkeyB };

// After.
const pubkeyA = publicKey('4HM9LW2rm3SR2ZdBiFK3D21ENmQWpqEJEhx1nfgcC3r9'); // ✅ No changes needed.
const bytesOfPubkeyB = new Uint8Array(Array(32).fill(0));
const pubkeyB = publicKey(bytesOfPubkeyB); // ⚠️ Use the `publicKey` helper to convert to a `PublicKey` string.
const pubkeyB = publicKey('11111111111111111111111111111111'); // ⚠️ Or pass in the base58 string directly.
```

Note that the `Pda` type has also been adjusted since it can no longer extend the `PublicKey` type (as it is now a primitive value and not an object). Instead, the `Pda` type is now defined as the following tuple `[PublicKey, number]`. If you are using Kinobi-generated library, they have been updated to ensure that you can pass either a `PublicKey` or a `Pda` in various generated method to avoid any breaking change. That being said, if you are using PDAs directly you need to update your code as showed below:

```ts
// Before.
const pdaA = findSomePda(umi, seedsA);
await fetchSomeAccount(umi, pdaA);

const pdaB = findSomePda(umi, seedsB);
await umi.rpc.getAccount(pdaB);

// After.
const pdaA = findSomePda(umi, seedsA);
await fetchSomeAccount(umi, pdaA); // ✅ No changes needed as generated methods now accept PublicKey | Pda.

const [publicKeyB] = findSomePda(umi, seedsB); // ⚠️ Destructure the Pda to get the PublicKey...
await umi.rpc.getAccount(publicKeyB); // ...because `getAccount` requires a `PublicKey`.
```

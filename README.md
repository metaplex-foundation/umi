# umi

_A Solana Framework for JavaScript clients._

Umi is a modular framework for building and using JavaScript clients for Solana programs. It provides a zero-dependency library that defines a set of core interfaces that libraries can rely on without being tied to a specific implementation. It is then up to the end-user to choose the implementation that best suits their needs. Umi also provides a set of default implementations and bundles that can be used out of the box allowing developers to get started quickly.

## Documentation

> [!TIP]
> Just want to mint NFTs? Go straight to the [MPL Core JS docs](https://developers.metaplex.com/core/sdk/javascript).
> Looking for fungible tokens? Straight to the [Token Metadata SPL Token Guide](https://developers.metaplex.com/guides/javascript/how-to-create-an-spl-token-on-solana)!

- [Installation](https://developers.metaplex.com/umi/getting-started)
- [Umi's interfaces](https://developers.metaplex.com/umi/interfaces)
- [Interface implementations](https://developers.metaplex.com/umi/implementations)
- [Public keys and signers](https://developers.metaplex.com/umi/public-keys-and-signers)
- [Connecting with an RPC](https://developers.metaplex.com/umi/rpc)
- [Sending transactions](https://developers.metaplex.com/umi/transactions)
- [Fetching accounts](https://developers.metaplex.com/umi/accounts)
- [Serializers](https://developers.metaplex.com/umi/serializers)
- [Uploading and downloading assets](https://developers.metaplex.com/umi/storage)
- [Sending Http requests](https://developers.metaplex.com/umi/http-requests)
- [Registering programs](https://developers.metaplex.com/umi/programs)
- [Umi plugins](https://developers.metaplex.com/umi/plugins)
- [Generating Umi clients via Kinobi](https://developers.metaplex.com/umi/kinobi)
- [Umi helpers](https://developers.metaplex.com/umi/helpers)
- [Web3.js adapters](https://developers.metaplex.com/umi/web3js-adapters)

## Versioning

Umi's packages are released as a **versioned set**. Every package in this repository is
version-linked, so a release bumps them all to the same version, and each package's
internal dependencies are pinned to the patch range (`~`) of that version.

When depending on Umi, treat the packages as a set: **pin them all, or range them all.**

```jsonc
// Good — core and siblings move together.
"@metaplex-foundation/umi": "^1.6.0",
"@metaplex-foundation/umi-bundle-defaults": "^1.6.0",

// Bad — core is frozen while the bundle is free to pull newer internals.
"@metaplex-foundation/umi": "1.6.0",
"@metaplex-foundation/umi-bundle-defaults": "^1.6.0",
```

`@metaplex-foundation/umi` is a **peer** dependency of every implementation package, so it
resolves to a single copy chosen by your project. Pinning it to an exact version while
allowing sibling packages to float lets a newer sibling load against an older core, which
surfaces as a missing export at import time:

```
SyntaxError: The requested module '@metaplex-foundation/umi'
does not provide an export named '...'
```

If you need fully reproducible installs, lock the whole tree with a lockfile — or an
`npm-shrinkwrap.json` if you publish a CLI — rather than pinning individual packages.

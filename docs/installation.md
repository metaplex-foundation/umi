# Installation

## For end-users

End-users using Umi to build applications need to install Umi and select the plugins they want to use. Alternatively, they can install the default bundle that includes a set of plugins that's suitable for most use cases. Note that, for now, the default bundle relies on web3.js for some of the interfaces so we have to install it as well.

```sh
npm install \
  @metaplex-foundation/umi \
  @metaplex-foundation/umi-bundle-defaults \
  @solana/web3.js
```

Then, you can create a new Umi instance using the `createUmi` function of the default bundle.

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const umi = createUmi('https://api.mainnet-beta.solana.com');
```

That's it, now pass your Umi instance around and add more plugins as needed.

## For library authors

Library authors that want to use Umi's interfaces to drastically reduce their dependencies only need to install the main Umi library. It is highly recommended to install it as a peer dependency to ensure the end-user does not end up with multiple versions of the Umi library.

```sh
npm install @metaplex-foundation/umi --save-peer
```

You can then use Umi's `Context` object or a subset of it to inject any interface you need in your functions. For instance:

```ts
import type { Context, PublicKey } from '@metaplex-foundation/umi';

export async function myFunction(
  context: Pick<Context, 'rpc' | 'serializer'>, // <-- Inject the interfaces you need.
  publicKey: PublicKey
): number {
  const rawAccount = await context.rpc.getAccount(publicKey);
  if (!rawAccount.exists) return 0;
  return context.serializer.u32().deserialize(rawAccount.data)[0];
}
```

## For testing

Also note that Umi comes with a testing bundle that can help both end-users and library authors to test their code. For instance, it includes a `MockStorage` implementation used for both the `UploaderInterface` and the `DownloaderInterface` so you can reliably test your code without having to rely on a real storage provider.

```sh
npm install @metaplex-foundation/umi @metaplex-foundation/umi-bundle-tests
```

<p align="center">
<strong>Next: <a href="./interfaces.md">Umi's interfaces ≫</a></strong>
</p>

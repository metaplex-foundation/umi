# umi

_A Solana Framework for JavaScript clients._

Umi is a modular framework for building and using JavaScript clients for Solana programs. It provides a zero-dependency library that defines a set of core interfaces that libraries can rely on without being tied to a specific implementation. It is then up to the end-user to choose the implementation that best suits their needs. Umi also provides a set of default implementations and bundles that can be used out of the box allowing developers to get started quickly.

## Installation

### For end-users

End-users using Umi to build applications need to install Umi and select the plugins they want to use. Alternatively, they can install the default bundle that includes a set of plugins that's suitable for most use cases.

```sh
npm install @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults
```

Then, you can create a new Umi instance using the `createUmi` function of the default bundle.

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const umi = createUmi('https://api.mainnet-beta.solana.com');
```

That's it, now pass your Umi instance around and add more plugins as needed.

### For library authors

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

### For testing

Also note that Umi comes with a testing bundle that can help both end-users and library authors to test their code. For instance, it includes a `MockStorage` implementation used for both the `UploaderInterface` and the `DownloaderInterface` so you can reliably test your code without having to rely on a real storage provider.

```sh
npm install @metaplex-foundation/umi @metaplex-foundation/umi-bundle-tests
```

## Interfaces

As mentioned above, Umi defines a set of core interfaces that makes it easy to interact with the Solana blockchain. Namely, they are:
- [`Signer`](https://umi-docs.vercel.app/interfaces/umi.Signer.html): An interface representing a wallet that can sign transactions and messages.
- [`EddsaSigner`](https://umi-docs.vercel.app/interfaces/umi.EddsaSigner.html): An interface to create keypairs, find PDAs and sign/verify messages using the EdDSA algorithm.
- [`RpcInterface`](https://umi-docs.vercel.app/interfaces/umi.RpcInterface.html): An interface representing a Solana RPC client.
- [`TransactionFactoryInterface`](https://umi-docs.vercel.app/interfaces/umi.TransactionFactoryInterface.html): An interface allowing us to create and serialize transactions.
- [`SerializerInterface`](https://umi-docs.vercel.app/interfaces/umi.SerializerInterface.html): An interface providing a vast range of serializers for any Solana types.
- [`UploaderInterface`](https://umi-docs.vercel.app/interfaces/umi.UploaderInterface.html): An interface allowing us to upload files and get a URI to access them.
- [`DownloaderInterface`](https://umi-docs.vercel.app/interfaces/umi.DownloaderInterface.html): An interface allowing us to download files from a given URI.
- [`HttpInterface`](https://umi-docs.vercel.app/interfaces/umi.HttpInterface.html): An interface allowing us to send HTTP requests.
- [`ProgramRepositoryInterface`](https://umi-docs.vercel.app/interfaces/umi.ProgramRepositoryInterface.html): An interface for registering and retrieving programs.

## The Context interface

The interfaces above are all defined in a `Context` interface that can be used to inject them in your code. The `Context` type is defined as follows:

```ts
interface Context {
  downloader: DownloaderInterface;
  eddsa: EddsaInterface;
  http: HttpInterface;
  identity: Signer;
  payer: Signer;
  programs: ProgramRepositoryInterface;
  rpc: RpcInterface;
  serializer: SerializerInterface;
  transactions: TransactionFactoryInterface;
  uploader: UploaderInterface;
};
```

As you can see the `Signer` interface is used twice in the context:
- Once for the `identity` which is the signer using your app.
- Once for the `payer` which is the signer paying for things like transaction fees and storage fees. Usually this will be the same signer as the `identity` but separating them offers more flexibility for apps – e.g. in case they wish to abstract some costs from their users to improve the user experience.

## The Umi interface

The `Umi` interface is built on top of this `Context` interface and simply adds a `use` method which enables end-users to register plugins. It is defined as follows:

```ts
interface Umi extends Context {
  use(plugin: UmiPlugin): Umi;
}
```

Therefore, end-users can add plugins to their `Umi` instance like so:

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { awsUploader } from '@metaplex-foundation/umi-uploader-aws';
import { myProgramRepository } from '../plugins';

const umi = createUmi('https://api.mainnet-beta.solana.com')
  .use(walletAdapterIdentity(...))
  .use(awsUploader(...))
  .use(myProgramRepository());
```

You can [learn more about Umi plugins and how to create them here](TODO).
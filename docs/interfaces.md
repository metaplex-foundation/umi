# Umi's interfaces

## The core interfaces

Umi defines a set of core interfaces that makes it easy to interact with the Solana blockchain. Namely, they are:
- [`Signer`](https://umi-docs.vercel.app/interfaces/umi.Signer.html): An interface representing a wallet that can sign transactions and messages.
- [`EddsaInterface`](https://umi-docs.vercel.app/interfaces/umi.EddsaInterface.html): An interface to create keypairs, find PDAs and sign/verify messages using the EdDSA algorithm.
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

You can [learn more about Umi plugins and how to create them here](./plugins.md).

<p align="center">
<strong>Next: <a href="./implementations.md">Interface implementations ≫</a></strong>
</p>

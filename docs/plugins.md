# Umi plugins

Whilst Umi is a small zero-dependency framework, it is designed to be extended with plugins. Plugins allow us to not only interact with its interfaces or swap out its interface implementations but also to add new features to Umi itself.

## Using plugins

To install a Umi plugin, you may simply call the `use` method on the Umi instance. This `use` method returns the Umi instance so they can be chained together.

```ts
import { somePlugin } from 'some-umi-library';
import { myLocalPlugin } from '../plugins';

umi.use(somePlugin).use(myLocalPlugin);
```

It is worth noting that libraries will often provide a function that returns a plugin instead of the plugin itself. This is done so that we can pass any arguments to configure the behaviour of the plugin.

```ts
import { somePlugin } from 'some-umi-library';
import { myLocalPlugin } from '../plugins';

umi.use(somePlugin(somePluginOptions))
  .use(myLocalPlugin(myLocalPluginOptions));
```

To stay consistent, the plugins provided by Umi always follow this pattern even if they don't require any arguments. Here are some examples:

```ts
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import { httpDownloader } from '@metaplex-foundation/umi-downloader-http';

umi.use(web3JsRpc('https://api.mainnet-beta.solana.com'))
  .use(mockStorage())
  .use(httpDownloader());
```

## Creating plugins

Under the hood, Umi defines a plugin as an object with an `install` function that can be used to extend the Umi instance however we want.

```ts
export const myPlugin: UmiPlugin = {
  install(umi: Umi) {
    // Do something with the Umi instance.
  },
}
```

As mentioned above, it is recommended to export plugin functions so we can request any argument that might be needed from the end user.

```ts
export const myPlugin = (myPluginOptions?: MyPluginOptions): UmiPlugin => ({
  install(umi: Umi) {
    // Do something with the Umi instance.
  },
})
```

## What to do in a plugin

Now that we know how to create a plugin, let's have a look at some examples of what we can do with them.

### Setting interface implementations

One of the most common use cases for plugins is to assign an implementation to one or several Umi interfaces. Here's an example of setting a fictional `MyRpc` implementation to the `rpc` interface. Notice how we can pass the Umi instance to the `MyRpc` implementation so it can rely on other interfaces if needed.

```ts
export const myRpc = (endpoint: string): UmiPlugin => ({
  install(umi: Umi) {
    umi.rpc = new MyRpc(umi, endpoint);
  },
})
```

### Decorating interface implementations

Another way of setting interface implementations is to decorate existing ones. This allows the end-user to compose plugins together by adding extra functionality to existing implementations without worrying about their underlying implementation details.

Here's an example of a plugin that decorates the `rpc` interface such that it logs all sent transactions to a third-party service.

```ts
export const myLoggingRpc = (provider: LoggingProvider): UmiPlugin => ({
  install(umi: Umi) {
    umi.rpc = new MyLoggingRpc(umi.rpc, provider);
  },
})
```

### Creating bundles

Since plugins can also call the `use` method on the Umi instance, it is possible to install plugins within plugins. This allows us to create bundles of plugins that can be installed together.

For instance, this is how Umi's "defaults" plugin bundle is defined:

```ts
export const defaultPlugins = (
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): UmiPlugin => ({
  install(umi) {
    umi.use(dataViewSerializer());
    umi.use(defaultProgramRepository());
    umi.use(fetchHttp());
    umi.use(httpDownloader());
    umi.use(web3JsEddsa());
    umi.use(web3JsRpc(endpoint, rpcOptions));
    umi.use(web3JsTransactionFactory());
  },
});
```

### Using interfaces

On top of setting and updating Umi's interfaces, plugins can also use them. One common use case for this is to allow libraries to register new programs to the program repository interfaces. Here's an example illustrating how the Token Metadata library registers its program. Notice how it sets the `override` argument to `false` so that the program is only registered if it doesn't already exist.

```ts
export const mplTokenMetadata = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createMplTokenMetadataProgram(), false);
  },
});
```

### Extending the Umi instance

Last but not least, plugins can also extend the feature set of the Umi instance. This allows libraries to provide their own interfaces, extend existing ones, etc.

A good example of that is the Candy Machine library which stores all candy guards in a repository — much like the program repository. This allows end-users to register their own guards so they can be recognised when creating, fetching and minting from candy machines with associated candy guards. To make this work, the library adds a new `guards` property to the Umi instance and assigns a new guard repository to it.

```ts
export const mplCandyMachine = (): UmiPlugin => ({
  install(umi) {
    umi.guards = new DefaultGuardRepository(umi);
    umi.guards.add(botTaxGuardManifest);
    umi.guards.add(solPaymentGuardManifest);
    umi.guards.add(tokenPaymentGuardManifest);
    // ...
  },
});
```

The slight issue with the code above is that the `Umi` type no longer reflects the actual instance. That is, TypeScript will complain that the `guards` property doesn't exist on the `Umi` type. To fix this, we can use TypeScript's [Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) to extend the `Umi` type so it includes the new property like so

```ts
declare module '@metaplex-foundation/umi' {
  interface Umi {
    guards: GuardRepository;
  }
}
```

This module augmentation can also be used to extend an existing interface. For instance, we could assign a new RPC interface that contains additional methods whilst letting TypeScript know about our added methods like so.

```ts
export const myRpcWithAddedMethods = (): UmiPlugin => ({
  install(umi) {
    umi.rpc = new MyRpcWithAddedMethods(umi.rpc);
  },
});

declare module '@metaplex-foundation/umi' {
  interface Umi {
    rpc: MyRpcWithAddedMethods;
  }
}
```

<p align="center">
<strong>Next: <a href="./kinobi.md">Generating Umi clients via Kinobi ≫</a></strong>
</p>

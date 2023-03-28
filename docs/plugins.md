# Umi plugins

Whilst Umi is a small zero-dependency framework, it is designed to be extended with plugins. Plugins allows us to not only interact with its interfaces or swap out its interface implementations, but also to add new features to Umi itself.

## Using plugins

In order to install a Umi plugin, you may simply call the `use` method on the Umi instance. This `use` method returns the Umi instance so they can be chained together.

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

As mentioned above, it is recommended to export plugin functions so we can request any argument that might be needed from the end-user.

```ts
export const myPlugin = (myPluginOptions?: MyPluginOptions): UmiPlugin => ({
  install(umi: Umi) {
    // Do something with the Umi instance.
  },
})
```

## Extending the Umi type

TODO
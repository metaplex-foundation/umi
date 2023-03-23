# Connecting with an RPC

Contacting the Solana blockchain via an RPC is an important part of any decentralized application. Umi provides a [RpcInterface](https://umi-docs.vercel.app/interfaces/umi.RpcInterface.html) that helps us do just that.

## Configuring the RPC's endpoint

When creating a new Umi instance via the default bundle, you must pass the RPC's endpoint as the first argument. Going forward, this it the endpoint that will be used every time you call a method on the RPC interface.

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const umi = createUmi("https://api.mainnet-beta.solana.com");
```

Alternatively, you may set or update the RPC implementation explicitly by the using the plugin they provide. For instance, the `web3JsRpc` plugin will set the RPC implementation to use the `@solana/web3.js` library.

```ts
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';

umi.use(web3JsRpc("https://api.mainnet-beta.solana.com"));
```

## Getting the RPC's endpoint and cluster

Once an RPC implementation has been set, you may access its endpoint and cluster via the following methods:

```ts
const endpoint = umi.rpc.getEndpoint();
const cluster = umi.rpc.getCluster();
```

Where `cluster` is one of the following:

```ts
type Cluster = "mainnet-beta" | "devnet" | "testnet" | "localnet" | "custom"
```

## Fetching accounts

TODO?
- accountExists
- getAccount
- getAccounts
- getProgramAccounts

## Sending transactions

TODO?
- sendTransaction
- confirmTransaction

## Fetching transactions

TODO?: getTransaction

## Airdropping SOL on supported clusters

TODO: airdrop

## Getting the balance of an account

TODO: getBalance

## Getting the latest blockhash

TODO: getLatestBlockhash

## Getting the most recent slot

TODO: getSlot

## Getting the rent exemption

TODO: getRent

## Sending custom RPC requests

TODO: call

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

## Sending transactions

The following methods can be used to send, confirm and fetch transactions:

```ts
const signature = await umi.rpc.sendTransaction(myTransaction);
const confirmResult = await umi.rpc.confirmTransaction(signature, { strategy });
const transaction = await umi.rpc.getTransaction(signature);
```

Since transactions are an important component of Solana clients, we discuss them in more detail on the [Sending transactions](./transactions.md) documentation page.

## Fetching accounts

The following methods can be used to fetch accounts or check for their existence:

```ts
const accountExists = await umi.rpc.accountExists(myPublicKey);
const maybeAccount = await umi.rpc.getAccount(myPublicKey);
const maybeAccounts = await umi.rpc.getAccounts(myPublicKeys);
const accounts = await umi.rpc.getProgramAccounts(myProgramId, { filters });
```

Since fetching accounts is one of the most common operations, we discuss it in more detail on the [Fetching accounts](./accounts.md) documentation page.

## Airdropping SOL on supported clusters

If the used cluster supports airdrops, you can use the following method to send SOL to an account and confirm the request.

```ts
// Send 1.5 SOL to "myPublicKey" and wait for the transaction to be confirmed.
await umi.rpc.airdrop(myPublicKey, sol(1.5));
```

## Getting the balance of an account

You may use the following method to get the SOL balance of any account. This will return a `SolAmount` object [as documented here](./helpers.md#amounts).

```ts
const balance = await umi.rpc.getBalance(myPublicKey);
```

## Getting the latest blockhash

You may get the latest blockhash with its expiry block height via the following method:

```ts
const { blockhash, lastValidBlockHeight } = await umi.rpc.getLatestBlockhash();
```

## Getting the most recent slot

You may get the most recent slot as a number via the following method:

```ts
const recentSlot = await umi.rpc.getSlot();
```

## Getting the rent exemption

If you need to figure out the storage fees for an account, you may use the `getRent` method and pass in the amount bytes that the account's data will require. This will return the rent-exemption fee — a.k.a storage fee — as a `SolAmount`.
  
  ```ts
const rent = await umi.rpc.getRent(100);
```

Note that this will automatically take the size of the account header into consideration so you only need to pass in the bytes of the account's data.

Say you now wanted to get the rent-exemption fee for 3 accounts with 100 bytes of data each. Running `umi.rpc.getRent(100 * 3)` will not provide an accurate response since it will only add the account header for one account and not three. This is why Umi allows you to pass in the account header size explicitly by setting the `includesHeaderBytes` option to `true`.

```ts
const rent = await umi.rpc.getRent((ACCOUNT_HEADER_SIZE + 100) * 3, {
  includesHeaderBytes: true
});
```

## Sending custom RPC requests

Because each RPC endpoint may provide their own custom methods, Umi allows you to send custom requests to the RPC via the `call` method. It takes the method name as the first argument and an optional array of parameters as the second argument.

```ts
const rpcResult = await umi.rpc.call("myCustomMethod", [myFirstParam, mySecondParam]);
```

<p align="center">
<strong>Next: <a href="./transactions.md">Sending transactions ≫</a></strong>
</p>

# Sending transactions

Managing and sending transactions is an important part of any Solana client. To help manage them, Umi provides a bunch of components:
- A [TransactionFactoryInterface](https://umi-docs.vercel.app/interfaces/umi.TransactionFactoryInterface.html) that can be used to create and (de)serialize transactions.
- A [TransactionBuilder](https://umi-docs.vercel.app/classes/umi.TransactionBuilder.html) that makes it easy to build transactions.
- A [RpcInterface](https://umi-docs.vercel.app/interfaces/umi.RpcInterface.html) that can be used to send, confirm and fetch transactions. You can [read more about the RPC interface here](./rpc.md).

## Transactions and Instructions

Umi defines its own set of interfaces for transactions, instructions and all other related types. Here's a quick overview of the most important ones with a link to their API documentation:

- [`Transaction`](https://umi-docs.vercel.app/interfaces/umi.Transaction.html): A transaction is composed of a versioned transaction message, a list of required signatures and a serialized version of its message so it can be easily signed.
- [`TransactionMessage`](https://umi-docs.vercel.app/interfaces/umi.TransactionMessage.html): A transaction message is composed of all required public keys, one or many compiled instructions using indexes instead of public keys, a recent blockhash and other attributes such as its version. A transaction message can have one of the following versions:
  - Version: `"legacy"`: The first Solana iteration of the transaction message.
  - Version: `0`: The first transaction message version that introduces transaction versioning. It also introduces address lookup tables.
- [`Instruction`](https://umi-docs.vercel.app/interfaces/umi.Instruction.html): An instruction is composed of a program id, a list of [`AccountMeta`](https://umi-docs.vercel.app/types/umi.AccountMeta.html) and some serialized data. Each account `AccountMeta` is composed of a public key, a boolean indicating whether it will be signing the transaction and another boolean indicating whether it's writable or not.

To create a new transaction, you may use the `create` method of the `TransactionFactoryInterface`. For instance, here's how you'd create a version `0` transaction with a single instruction:

```ts
const transaction = umi.transactions.create({
  version: 0,
  blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
  instructions: [myInstruction],
  payer: umi.payer.publicKey,
})
```

The transaction factory interface can also be used to serialize and deserialize transactions and their messages.

```ts
const mySerializedTransaction = umi.transactions.serialize(myTransaction);
const myTransaction = umi.transactions.deserialize(mySerializedTransaction);
const mySerializedMessage = umi.transactions.serializeMessage(myMessage);
const myMessage = umi.transactions.deserializeMessage(mySerializedMessage);
```

All of this is nice but can be a bit tedious to build every single time we want to send a transaction to the blockchain. Fortunately, Umi provides a `TransactionBuilder` that can help with that.

## Transaction Builders

Transaction builders are immutable objects that can be used to gradually build transactions until we are ready to build, sign and/or send them. They are composed of a list of [`WrappedInstruction`](https://umi-docs.vercel.app/types/umi.WrappedInstruction.html) and various options that can be used to configure the built transaction. A `WrappedInstruction` is a simple object containing an `instruction` and a bunch of other attributes. Namely:
- A `bytesCreatedOnChain` attribute that, if the instruction ends up creating accounts, tells us how many bytes they will take on chain (including the account headers).
- and a `signers` array so that we know which signers are required for this particular instruction as opposed to the whole transaction. This enables us to split the transaction builder into two without losing any information as we will see later.

We can create a new transaction builder using the `transactionBuilder` function and add instructions to it using its `add` method. You may also use the `prepend` method to push an instruction at the beginning of the transaction.

```ts
let builder = transactionBuilder()
  .add(myWrappedInstruction)
  .add(myOtherWrappedInstruction)
  .prepend(myFirstWrappedInstruction);
```

Since transaction builders are immutable, we must be careful to always assign the result of the `add` and `prepend` methods to a new variable. The same goes for any other method that updates the transaction builder by returning a new one.

```ts
builder = builder.add(myWrappedInstruction);
builder = builder.prepend(myWrappedInstruction);
```

Note that either of these methods also accepts other transaction builders and will merge them into the current one. In practice, this means program libraries can write (or [auto-generate](./kinobi.md)) their own helper methods that return transaction builders so they can be composed together by the end-user.

```ts
import { transferSol, addMemo } from '@metaplex-foundation/mpl-essentials';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';

let builder = transactionBuilder()
  .add(addMemo(umi, { ... }))
  .add(createNft(umi, { ... }))
  .add(transferSol(umi, { ... }))
```

You may also split a transaction builder into two if, for instance, the transaction that would be created from the original builder would be too big to be sent to the blockchain. To do so, you may use the [`splitByIndex`](https://umi-docs.vercel.app/classes/umi.TransactionBuilder.html#splitByIndex) method or the more dangerous [`unsafeSplitByTransactionSize`](https://umi-docs.vercel.app/classes/umi.TransactionBuilder.html#unsafeSplitByTransactionSize) method. Make sure to read the comment on the API reference for the latter.

```ts
const [builderA, builderB] = builder.splitByIndex(2);
const splitBuilders = builder.unsafeSplitByTransactionSize(umi);
```

And there's much more you can do with transaction builders. Feel free to [read the API reference](https://umi-docs.vercel.app/classes/umi.TransactionBuilder.html) to learn more but here's a quick overview of some of the other methods that can configure our transaction builders.

```ts
// Setters.
builder = builder.setVersion(myTransactionVersion); // Sets the transaction version.
builder = builder.useLegacyVersion(); // Sets the transaction version to "legacy".
builder = builder.useV0(); // Sets the transaction version to 0 (default).
builder = builder.empty(); // Removes all instructions from the builder but keeps the configurations.
builder = builder.setItems(myWrappedInstructions); // Overwrite the wrapped instructions with the given ones.
builder = builder.setAddressLookupTables(myLuts); // Set the address lookup tables, only for version 0 transactions.
builder = builder.setFeePayer(myPayer); // Set a custom fee payer.
builder = builder.setBlockhash(myBlockhash); // Set the blockhash to use for the transaction.
builder = await builder.setLatestBlockhash(umi); // Fetch the latest blockhash and use it for the transaction.

// Getters.
const transactionSize = builder.getTransactionSize(umi); // Return the size in bytes of the built transaction.
const isSmallEnough = builder.fitsInOneTransaction(umi); // Whether the built transaction would fit in one transaction.
const transactionRequired = builder.minimumTransactionsRequired(umi); // Return the minimum number of transactions required to send all instructions.
const blockhash = builder.getBlockhash(); // Return the configured blockhash if any.
const feePayer = builder.getFeePayer(umi); // Return the configured fee payer or uses `umi.payer` if none is configured.
const instructions = builder.getInstructions(umi); // Return all unwrapped instructions.
const signers = builder.getSigners(umi); // Return all deduplicated signers, including the fee payer.
const bytes = builder.getBytesCreatedOnChain(); // Return the total number of bytes that would be created on chain.
const solAmount = await builder.getRentCreatedOnChain(umi); // Return the total number of bytes that would be created on chain.
```

Notice that we are passing an instance of `Umi` to some of them. This is because they will need to access some of Umi's core interfaces to perform their task.

Now that we have our transaction builder ready, let's see how we can use it to build, sign and send transactions.

## Building and signing transactions

When you're ready to build your transaction, you may simply use the `build` method. This method will return a `Transaction` object that you can then sign and send to the blockchain.

```ts
const transaction = builder.build(umi);
```

Note that the `build` method will throw an error if no blockhash was set on the builder. If you wish to build the transaction using the latest blockhash, you may use the `buildWithLatestBlockhash` method instead.

```ts
const transaction = await builder.buildWithLatestBlockhash(umi);
```

At this point, you could use the built transaction and get all deduplicated signers from the builder via the `getSigners` method to sign it (See [Signing transactions](./publickeys-signers.md#signing-transactions) for more details). However, Umi provides a `buildAndSign` method that can do that for you. When using `buildAndSign`, the latest blockhash will be used if and only if it was not set on the builder.

```ts
const signedTransaction = await builder.buildAndSign(umi);
``` 

## Sending transactions

Now that we have a signed transaction, let's see how we can send it to the blockchain.

One way to do this is to use the `sendTransaction` and `confirmTransaction` methods of the `RpcInterface` like so. When confirming the transaction, we have to provide a confirm strategy which can be of type `blockhash` or `durableNonce`, each of them requiring a different set of parameters. Here's how we would send and confirm a transaction using the `blockhash` strategy.

```ts
const signedTransaction = await builder.buildAndSign(umi);
const signature = await umi.rpc.sendTransaction(signedTransaction);
const confirmResult = await umi.rpc.confirmTransaction(signature, {
  strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) }
});
```

Since this is a very common task, Umi provides helper methods on the transaction builder to do this for us. That way, the code above can be rewritten as follows.

```ts
const confirmResult = await builder.sendAndConfirm(umi);
```

This will build and sign the transaction using the `buildAndSign` method before sending and confirming the transaction using the `blockhash` strategy by default. It will reuse the transaction blockhash for the confirm strategy to avoid the extra Http request when applicable. That being said, you may still explicitly provide a confirm strategy or set any options like so.

```ts
const confirmResult = await builder.sendAndConfirm(umi, {
  // Send options.
  send: {
    skipPreflight: true,
  },

  // Confirm options.
  confirm: {
    strategy: { type: 'durableNonce', minContextSlot, nonceAccountPubkey, nonceValue },
  }
});
```

Also note that you may send a transaction without waiting for it to be confirmed via the `send` method of the transaction builder.

```ts
const signature = await builder.send(umi);
```

## Using address lookup tables

Starting from version 0 transactions, you may use address lookup tables to reduce the size of transactions.

```ts
const myLut: AddressLookupTableInput = {
  publicKey: publicKey('...') // The address of the lookup table account.
  addresses: [ // The addresses registered in the lookup table.
    publicKey('...'),
    publicKey('...'),
    publicKey('...'),
  ]
}

builder = builder.setAddressLookupTables([myLut]);
```

To create an address lookup table, you might be interested in the `@metaplex-foundation/mpl-essentials` package which provides helpers for creating them.

```ts
import { createLut } from '@metaplex-foundation/mpl-essentials';

// Create a lookup table.
const [lutBuilder, lut] = createLut(umi, {
  recentSlot: await umi.rpc.getSlot({ commitment: 'finalized' }),
  addresses: [myAddressA, myAddressB, myAddressC],
});
await lutBuilder.sendAndConfirm(umi);

// Later on, use the created lookup table.
myBuilder = myBuilder.setAddressLookupTables([lut]);
```

## Fetching sent transactions

Let's now take a look at how to fetch a transaction that was sent to the blockchain.

For that, we can use the `getTransaction` method of the `RpcInterface` and provide the signature of the transaction we want to fetch.

```ts
const transaction = await umi.rpc.getTransaction(signature);
```

This will return an instance of [`TransactionWithMeta`](https://umi-docs.vercel.app/types/umi.TransactionWithMeta.html) which is a superset of `Transaction` and contains an extra `meta` property that provides additional information on the transaction. For instance, you could access the logs of a sent transaction like so.

```ts
const transaction = await umi.rpc.getTransaction(signature);
const logs: string[] = transaction.meta.logs;
```

<p align="center">
<strong>Next: <a href="./accounts.md">Fetching accounts ≫</a></strong>
</p>

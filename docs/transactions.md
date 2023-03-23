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

We can create a new transaction builder using the `transactionBuilder` function and add instructions to it using its `add` method. You may also use the `prepend` method to push an instruction at the beginning of the transaction. Note that either of these methods also accept other transaction builders and will merge them into the current one.

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

You may also split a transaction builder into two if, for instance, the transaction that would be created from the original builder would be too big to be sent to the blockchain. To do so, you may use the [`splitByIndex`](https://umi-docs.vercel.app/classes/umi.TransactionBuilder.html#splitByIndex) method or the more dangerous [`unsafeSplitByTransactionSize`](https://umi-docs.vercel.app/classes/umi.TransactionBuilder.html#unsafeSplitByTransactionSize) method. Make sure to ready the comment on the API reference for the latter.

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

Now that we have our transaction builder ready, let's see how we can use it to build, sign and send transactions.

## Building and signing transactions

TODO

```ts
TODO
```

## Sending transactions

TODO

```ts
TODO
```

## Using address lookup tables

TODO
- Mention mpl-essentials for creating LUTs

```ts
TODO
```

## Fetching sent transactions

TODO

```ts
TODO
```
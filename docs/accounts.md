# Fetching accounts

Let's see how we can fetch account data from the Solana blockchain using Umi. For that we will need to the [`RpcInterface`](https://umi-docs.vercel.app/interfaces/umi.RpcInterface.html) to fetch accounts with serialized data and the [`SerializerInterface`](https://umi-docs.vercel.app/interfaces/umi.SerializerInterface.html) to help deserialize them.

## Account definitions

Umi defines an account with serialized data as an `RpcAccount`. It contains information from the account header — i.e. the SOL on the account, the program owner, etc. — and the account's public key and serialized data.

```ts
type RpcAccount = AccountHeader & {
  publicKey: PublicKey;
  data: Uint8Array;
};
```

It also defines a `MaybeRpcAccount` type that represents an `RpcAccount` that may or may exists. When the account does not exist, it keeps track of its public key so that, in a list of accounts, we know which public key was not found.

```ts
type MaybeRpcAccount =
  | ({ exists: true } & RpcAccount)
  | { exists: false; publicKey: PublicKey };
```

When dealing with `MaybeRpcAccount`s, you may use the `assertAccountExists` helper method to assert that an account exists and fail otherwise.

```ts
assertAccountExists(myMaybeAccount);
// From now on, we know myMaybeAccount is an RpcAccount.
```

Last but not least, it provides a generic `Account` type that directly exposes the deserialized data — represented as a generic type `T` — with two extra attributes: `publicKey` and `header`. This allows us to directly access the deserialized data without nested `data` attributes.

```ts
type Account<T extends object> = T & {
  publicKey: PublicKey;
  header: AccountHeader;
};
```

## Fetching RPC accounts

Now that we know how accounts are represented in Umi, let's see how we can fetch them.

First of all, we can fetch a single account using the `getAccount` method of the `RpcInterface`. This will return a `MaybeRpcAccount` instance since the account may or may not exist. As mentioned above, you may use the `assertAccountExists` function to ensure it does.

```ts
const myAccount = await umi.rpc.getAccount(myPublicKey);
assertAccountExists(myAccount);
```

Note that if you are only interested to know if an account exists at the given address, you may use the `accountExists` method instead.

```ts
const accountExists = await umi.rpc.accountExists(myPublicKey);
```

If you need to fetch multiple accounts at once, you may use the `getAccounts` method instead. This will return a list of `MaybeRpcAccount`s, one for each public key you passed in.

```ts
const myAccounts = await umi.rpc.getAccounts(myPublicKeys);
```

Finally, the `getProgramAccounts` method can be used to fetch all accounts from a given program that match a given set of filters. This method returns a list of `RpcAccount` directly since it will only return accounts that exist. Refer to the following [Get Program Account documentation](https://solanacookbook.com/guides/get-program-accounts.html) to learn more about filters and data slicing.

```ts
// Fetch all accounts from a program.
const allProgramAccounts = await umi.rpc.getProgramAccounts(myProgramId);

// Fetch a slice of all accounts from a program.
const slicedProgramAccounts = await umi.rpc.getProgramAccounts(myProgramId, {
  dataSlice: { offset: 32, length: 8 },
});

// Fetch some accounts from a program that match a given set of filters.
const filteredProgramAccounts = await umi.rpc.getProgramAccounts(myProgramId, {
  filters: [
    { dataSize: 42 },
    { memcmp: { offset: 0, bytes: new Uint8Array([1, 2, 3]) } },
  ],
});
```

Note that when fetching program accounts, you might be interested in [`GpaBuilder`s](./helpers.md#gpabuilders).

## Deserializing accounts

TODO

## Fetching deserialized accounts

TODO

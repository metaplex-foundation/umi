# Umi helpers

On top of the core interfaces, Umi provides a set of helper functions that can be used to make working with Solana programs easier.

## Amounts

An `Amount` is special type that allows us to define big decimal numbers. It does this by representing the number in its lowest possible unit (e.g. lamports) and then keeping track of the decimal number of that unit (e.g. 9). This allows for a more accurate representation of the number and avoids JavaScript rounding errors caused by IEEE 754 floating point numbers. It also uses an string identifier to ensure that we are dealing with amounts in the same unit when performing operations. Here's how the `Amount` generic type is defined:

```ts
type AmountIdentifier = 'SOL' | 'USD' | '%' | 'splToken' | string;
type AmountDecimals = number;
type Amount<
  I extends AmountIdentifier = AmountIdentifier,
  D extends AmountDecimals = AmountDecimals
> = {
  /** The amount in its lower possible unit such that it does not contain decimals. */
  basisPoints: bigint;
  /** The identifier of the amount. */
  identifier: I;
  /** The number of decimals in the amount. */
  decimals: D;
};
```

Umi also provide specific versions of this `Amount` type for specific cases like SOLs and USDs.

```ts
type SolAmount = Amount<'SOL', 9>;
type UsdAmount = Amount<'USD', 2>;
type PercentAmount<D extends AmountDecimals> = Amount<'%', D>;
```

In order to make it easier for developers to handle amounts, Umi provides a set of helper functions that can be used to create, format, and perform operations on amounts.

You may want to [check out the "Utils — Amounts" section of the API references](https://umi-docs.vercel.app/modules/umi.html) to learn more about all these helpers but here's a quick list of functions that can help create new amount types.

```ts
// Creates an amount from a basis points.
createAmount(123, 'USD', 2); // -> Amount for "USD 1.23"

// Creates an amount from a decimal number.
createAmountFromDecimals(1.23, 'USD', 2); // -> Amount for "USD 1.23"

// Helper functions to create USD amounts.
usd(1.23) // -> Amount for "USD 1.23"

// Helper functions to handle SOL amounts.
sol(1.23) // -> Amount for "1.23 SOL"
lamports(1_230_000_000) // -> Amount for "1.23 SOL"

// Helper function to create percent amounts.
percentAmount(50.42); // -> Amount for "50.42%"
percentAmount(50.42, 2); // -> Amount for "50.42%"
percentAmount(50.42, 0); // -> Amount for "50%"

// Helper function to create token amounts.
tokenAmount(123); // -> Amount for "123 Tokens"
tokenAmount(123, 'splToken.BONK'); // -> Amount for "123 BONK"
tokenAmount(123.45, 'splToken.BONK', 2); // -> Amount for "123.45 BONK"
```

## Options

In Rust, we define optional values as an `Option<T>` enum which can either be `Some(T)` or `None`. This is usually represented as `T | null` in the JavaScript world. The issue with this approach is it doesn't work with nested options. For instance, an `Option<Option<T>>` in Rust would become a `T | null | null` in JavaScript which is equivalent to `T | null`. That means, there is no way for us to represent the `Some(None)` value in JavaScript or any other nested option.

To solve this issue, Umi provides [a `Option<T>` union type](https://umi-docs.vercel.app/types/umi.Option.html) that works very similarly to the Rust `Option<T>` type. It is defined as follows:

```ts
type Option<T> = Some<T> | None;
type Some<T> = { __option: 'Some'; value: T };
type None = { __option: 'None' };
```

To improve the developer experience, Umi offers a `some` and `none` function to create options. The type `T` of the option can either be inferred by TypeScript or explicitly provided.

```ts
// Create an option with a value.
some('Hello World');
some<number | string>(123);

// Create an empty option.
none();
none<number | string>();
```

Umi also provides a set of helper functions to verify and manipulate options.

```ts
// Check if an option is a `Some` or `None`.
isSome(some('Hello World')); // -> true
isSome(none()); // -> false
isNone(some('Hello World')); // -> false
isNone(none()); // -> true

// Unwrap the value of an option if it is a `Some` or return null.
unwrapSome(some('Hello World')) // -> 'Hello World'
unwrapSome(none()) // -> null

// Unwrap the value of an option if it is a `Some`
// or return the value of the provided callback.
unwrapSomeOrElse(some('Hello World'), () => 'Default'); // -> 'Hello World'
unwrapSomeOrElse(none(), () => 'Default'); // -> 'Default'
```

## DateTimes

Umi provides a `DateTime` type that can be used to represent a date and time using a timestamp in seconds. It is simply defined as a `bigint` number and offers a set of helper functions to create and format date times.

```ts
// Create a new DateTime.
dateTime(1680097346);
dateTime(new Date(Date.now()));
dateTime("2021-12-31T23:59:59.000Z");

// Create a new DateTime for the current time.
now();

// Format a DateTime.
formatDateTime(now());
formatDateTime(now(), 'fr-FR', myFormatOptions);
```

## GpaBuilders

[_Coming soon..._](https://umi-docs.vercel.app/classes/umi.GpaBuilder.html)

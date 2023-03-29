# Umi helpers

On top of the core interfaces, Umi provides a set of helper functions that can be used to make working with Solana programs easier.

## Amounts

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

Here's a list of helper functions that can help create new amount types.

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

Here's a list of helper functions that can help manipulate amounts.
TODO: Show a few and link to API references.

```ts
isAmount
isSolAmount
sameAmounts
assertAmount
assertSolAmount
assertSameAmounts
addAmounts
subtractAmounts
multiplyAmount
divideAmount
absoluteAmount
compareAmounts
isEqualToAmount
isLessThanAmount
isLessThanOrEqualToAmount
isGreaterThanAmount
isGreaterThanOrEqualToAmount
isZeroAmount
isPositiveAmount
isNegativeAmount
amountToString
amountToNumber
displayAmount
mapAmountSerializer
```

## Options

_Coming soon..._

## DateTimes

_Coming soon..._

## GpaBuilders

_Coming soon..._

https://umi-docs.vercel.app/classes/umi.GpaBuilder.html
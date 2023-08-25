import { None, Some, isOption, isSome } from './common';

/**
 * A type that defines the recursive unwrapping of a type `T`
 * such that all nested {@link Option} types are unwrapped.
 *
 * For each nested {@link Option} type, if the option is a {@link Some},
 * it returns the type of its value, otherwise, it returns the provided
 * fallback type `U` which defaults to `null`.
 *
 * @category Utils — Options
 */
export type UnwrappedOption<T, U = null> = T extends Some<infer TValue>
  ? UnwrappedOption<TValue, U>
  : T extends None
  ? U
  : T extends
      | string
      | number
      | boolean
      | symbol
      | bigint
      | undefined
      | null
      | Uint8Array
      | Date
  ? T
  : T extends object
  ? { [key in keyof T]: UnwrappedOption<T[key], U> }
  : T extends Array<infer TItem>
  ? Array<UnwrappedOption<TItem, U>>
  : T;

/**
 * Recursively go through a type `T`such that all
 * nested {@link Option} types are unwrapped.
 *
 * For each nested {@link Option} type, if the option is a {@link Some},
 * it returns its value, otherwise, it returns the provided fallback value
 * which defaults to `null`.
 *
 * @category Utils — Options
 */
export function unwrapOptionRecursively<T>(input: T): UnwrappedOption<T>;
export function unwrapOptionRecursively<T, U>(
  input: T,
  fallback: () => U
): UnwrappedOption<T, U>;
export function unwrapOptionRecursively<T, U = null>(
  input: T,
  fallback?: () => U
): UnwrappedOption<T, U> {
  // Types to bypass.
  if (!input || ArrayBuffer.isView(input)) {
    return input as UnwrappedOption<T, U>;
  }

  const next = <X>(x: X) =>
    (fallback
      ? unwrapOptionRecursively(x, fallback)
      : unwrapOptionRecursively(x)) as UnwrappedOption<X, U>;

  // Handle Option.
  if (isOption(input)) {
    if (isSome(input)) return next(input.value) as UnwrappedOption<T, U>;
    return (fallback ? fallback() : null) as UnwrappedOption<T, U>;
  }

  // Walk.
  if (Array.isArray(input)) {
    return input.map(next) as UnwrappedOption<T, U>;
  }
  if (typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([k, v]) => [k, next(v)])
    ) as UnwrappedOption<T, U>;
  }
  return input as UnwrappedOption<T, U>;
}

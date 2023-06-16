/**
 * Defines a type `T` that can also be `null`.
 * @category Utils — Options
 */
export type Nullable<T> = T | null;

/**
 * An implementation of the Rust Option type in JavaScript.
 * It can be one of the following:
 * - <code>{@link Some}<T></code>: Meaning there is a value of type T.
 * - <code>{@link None}</code>: Meaning there is no value.
 *
 * @category Utils — Options
 */
export type Option<T> = Some<T> | None;

/**
 * Represents an option of type `T` that has a value.
 *
 * @see {@link Option}
 * @category Utils — Options
 */
export type Some<T> = { __option: 'Some'; value: T };

/**
 * Represents an option of type `T` that has no value.
 *
 * @see {@link Option}
 * @category Utils — Options
 */
export type None = { __option: 'None' };

/**
 * Creates a new {@link Option} of type `T` that has a value.
 *
 * @see {@link Option}
 * @category Utils — Options
 */
export const some = <T>(value: T): Option<T> => ({ __option: 'Some', value });

/**
 * Creates a new {@link Option} of type `T` that has no value.
 *
 * @see {@link Option}
 * @category Utils — Options
 */
export const none = <T>(): Option<T> => ({ __option: 'None' });

/**
 * Whether the given {@link Option} is a {@link Some}.
 * @category Utils — Options
 */
export const isSome = <T>(option: Option<T>): option is Some<T> =>
  option.__option === 'Some';

/**
 * Whether the given {@link Option} is a {@link None}.
 * @category Utils — Options
 */
export const isNone = <T>(option: Option<T>): option is None =>
  option.__option === 'None';

/**
 * Unwraps the value of an {@link Option} of type `T`.
 * If the option is a {@link Some}, it returns its value,
 * Otherwise, it returns `null`.
 *
 * @category Utils — Options
 * @deprecated Use {@link unwrapOption} instead.
 */
export const unwrapSome = <T>(option: Option<T>): Nullable<T> =>
  isSome(option) ? option.value : null;

/**
 * Unwraps the value of an {@link Option} of type `T`
 * or returns a custom fallback value.
 * If the option is a {@link Some}, it returns its value,
 * Otherwise, it returns the return value of the provided fallback callback.
 *
 * @category Utils — Options
 * @deprecated Use {@link unwrapOption} instead.
 */
export const unwrapSomeOrElse = <T, U>(
  option: Option<T>,
  fallback: () => U
): T | U => (isSome(option) ? option.value : fallback());

/**
 * Unwraps the value of an {@link Option} of type `T`
 * or returns a fallback value that defaults to `null`.
 *
 * @category Utils — Options
 */
export function unwrapOption<T>(option: Option<T>): Nullable<T>;
export function unwrapOption<T, U>(option: Option<T>, fallback: () => U): T | U;
export function unwrapOption<T, U = null>(
  option: Option<T>,
  fallback?: () => U
): T | U {
  if (isSome(option)) return option.value;
  return fallback ? fallback() : (null as U);
}

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
type UnwrappedOption<T, U = null> = T extends Some<infer TValue>
  ? UnwrappedOption<TValue, U>
  : T extends None
  ? U
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
  // Because null passes `typeof input === 'object'`.
  if (!input) return input as UnwrappedOption<T, U>;
  const isOption = typeof input === 'object' && '__option' in input;
  const next = <X>(x: X) =>
    (fallback
      ? unwrapOptionRecursively(x, fallback)
      : unwrapOptionRecursively(x)) as UnwrappedOption<X, U>;

  // Handle None.
  if (isOption && input.__option === 'None') {
    return (fallback ? fallback() : null) as UnwrappedOption<T, U>;
  }

  // Handle Some.
  if (isOption && input.__option === 'Some' && 'value' in input) {
    return next(input.value) as UnwrappedOption<T, U>;
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

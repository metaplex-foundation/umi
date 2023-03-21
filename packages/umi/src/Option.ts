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
 */
export const unwrapSomeOrElse = <T, U>(
  option: Option<T>,
  fallback: () => U
): T | U => (isSome(option) ? option.value : fallback());
